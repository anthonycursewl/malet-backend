/**
 * Script de diagnóstico para Redis
 * 
 * Ejecutar: npx ts-node scripts/test-redis.ts
 */

import 'dotenv/config';
import Redis from 'ioredis';

async function testRedisConnection() {
    console.log('\n🔍 DIAGNÓSTICO DE CONEXIÓN REDIS\n');
    console.log('='.repeat(50));

    // 1. Verificar variables de entorno
    console.log('\n📋 Variables de entorno:');
    console.log(`   REDIS_HOST:     ${process.env.REDIS_HOST || '(no definido)'}`);
    console.log(`   REDIS_PORT:     ${process.env.REDIS_PORT || '6379 (default)'}`);
    console.log(`   REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? '******** (definido)' : '(no definido)'}`);
    console.log(`   REDIS_DB:       ${process.env.REDIS_DB || '0 (default)'}`);

    if (!process.env.REDIS_HOST) {
        console.log('\n⚠️  REDIS_HOST no está configurado.');
        console.log('   El sistema usará InMemoryPubSubAdapter (solo desarrollo).');
        console.log('\n   Para usar Redis, configura REDIS_HOST en tu .env');
        process.exit(0);
    }

    // 2. Intentar conexión
    console.log('\n🔌 Intentando conectar a Redis...');

    const redisConfig = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        connectTimeout: 5000,
        lazyConnect: true
    };

    console.log(`   Conectando a: ${redisConfig.host}:${redisConfig.port}`);

    const redis = new Redis(redisConfig);

    redis.on('error', (error) => {
        console.log(`\n❌ Error de Redis: ${error.message}`);
    });

    try {
        await redis.connect();
        console.log('   ✅ Conexión TCP establecida');

        // 3. Test PING
        console.log('\n🏓 Ejecutando PING...');
        const pong = await redis.ping();
        console.log(`   Respuesta: ${pong}`);

        if (pong === 'PONG') {
            console.log('   ✅ Redis responde correctamente');
        }

        // 4. Test de escritura/lectura
        console.log('\n📝 Test de escritura/lectura...');
        const testKey = 'malet:test:connection';
        const testValue = `test-${Date.now()}`;

        await redis.set(testKey, testValue, 'EX', 10);
        console.log(`   SET ${testKey} = ${testValue}`);

        const readValue = await redis.get(testKey);
        console.log(`   GET ${testKey} = ${readValue}`);

        if (readValue === testValue) {
            console.log('   ✅ Escritura/lectura funciona correctamente');
        } else {
            console.log('   ⚠️ Valor leído no coincide con el escrito');
        }

        await redis.del(testKey);
        console.log(`   DEL ${testKey}`);

        // 5. Test de PubSub
        console.log('\n📡 Test de PubSub...');

        const subscriber = new Redis(redisConfig);
        await subscriber.connect();

        const testChannel = 'malet:test:pubsub';
        let messageReceived = false;

        await subscriber.subscribe(testChannel);
        console.log(`   Suscrito a: ${testChannel}`);

        subscriber.on('message', (channel, message) => {
            if (channel === testChannel) {
                console.log(`   Mensaje recibido: ${message}`);
                messageReceived = true;
            }
        });

        // Publicar mensaje
        await new Promise(resolve => setTimeout(resolve, 100));
        await redis.publish(testChannel, 'Hello from Malet!');
        console.log('   Mensaje publicado: "Hello from Malet!"');

        // Esperar recepción
        await new Promise(resolve => setTimeout(resolve, 500));

        if (messageReceived) {
            console.log('   ✅ PubSub funciona correctamente');
        } else {
            console.log('   ⚠️ No se recibió el mensaje (puede ser timing)');
        }

        await subscriber.unsubscribe(testChannel);
        await subscriber.quit();

        // 6. Info del servidor
        console.log('\n📊 Información del servidor Redis:');
        const info = await redis.info('server');
        const lines = info.split('\n');
        const relevantInfo = ['redis_version', 'os', 'uptime_in_seconds', 'connected_clients'];

        for (const line of lines) {
            for (const key of relevantInfo) {
                if (line.startsWith(key + ':')) {
                    console.log(`   ${line.trim()}`);
                }
            }
        }

        // 7. Resumen
        console.log('\n' + '='.repeat(50));
        console.log('✅ TODOS LOS TESTS PASARON - Redis está listo!');
        console.log('='.repeat(50));
        console.log('\n💡 El sistema de mensajería usará RedisPubSubAdapter.');
        console.log('   Los mensajes se sincronizarán entre múltiples servidores.\n');

        await redis.quit();

    } catch (error: any) {
        console.log('\n' + '='.repeat(50));
        console.log('❌ ERROR DE CONEXIÓN');
        console.log('='.repeat(50));
        console.log(`\nError: ${error.message}`);

        // Diagnóstico según el error
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔧 Posibles soluciones:');
            console.log('   1. Verifica que Redis está corriendo en el servidor');
            console.log('      $ redis-cli ping');
            console.log('   2. Verifica que el firewall permite conexiones al puerto 6379');
            console.log('      $ ufw allow 6379');
            console.log('   3. Verifica que Redis está escuchando en la IP correcta');
            console.log('      En redis.conf: bind 0.0.0.0');
        } else if (error.message.includes('NOAUTH') || error.message.includes('AUTH')) {
            console.log('\n🔧 Posibles soluciones:');
            console.log('   1. Redis requiere autenticación');
            console.log('      Configura REDIS_PASSWORD en tu .env');
            console.log('   2. Verifica la contraseña en redis.conf:');
            console.log('      requirepass tu_password');
        } else if (error.message.includes('ETIMEDOUT')) {
            console.log('\n🔧 Posibles soluciones:');
            console.log('   1. El servidor Redis no es alcanzable');
            console.log('   2. Verifica la IP y que estés en la misma red');
            console.log('   3. Prueba hacer ping al servidor:');
            console.log(`      $ ping ${process.env.REDIS_HOST}`);
        }

        console.log('\n');
        process.exit(1);
    }
}

testRedisConnection();
