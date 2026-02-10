import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import {
  PubSubPort,
  MessageEvent,
  ReadReceiptEvent,
  TypingEvent,
  PresenceEvent,
} from '../../domain/ports/out/pubsub.port';

/**
 * Canales de Redis para eventos
 */
const CHANNELS = {
  MESSAGE_NEW: 'messaging:message:new',
  READ_RECEIPT: 'messaging:read:receipt',
  TYPING: 'messaging:typing',
  PRESENCE: 'messaging:presence',
} as const;

/**
 * Implementación de PubSub usando Redis.
 *
 * Esta implementación permite escalabilidad horizontal:
 * - Múltiples servidores pueden conectarse al mismo Redis
 * - Los eventos se propagan a todos los servidores
 * - Cada servidor notifica a sus clientes WebSocket locales
 *
 * Configuración via variables de entorno:
 * - REDIS_HOST: Host de Redis (default: localhost)
 * - REDIS_PORT: Puerto de Redis (default: 6379)
 * - REDIS_PASSWORD: Contraseña (opcional)
 * - REDIS_DB: Número de base de datos (default: 0)
 */
@Injectable()
export class RedisPubSubAdapter
  implements PubSubPort, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisPubSubAdapter.name);

  // Cliente para publicar
  private publisher: Redis;

  // Cliente para suscribirse (debe ser separado en Redis)
  private subscriber: Redis;

  // Callbacks registrados
  private messageCallbacks: ((event: MessageEvent) => void)[] = [];
  private readReceiptCallbacks: ((event: ReadReceiptEvent) => void)[] = [];
  private typingCallbacks: ((event: TypingEvent) => void)[] = [];
  private presenceCallbacks: ((event: PresenceEvent) => void)[] = [];

  async onModuleInit() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      retryDelayOnFailover: 1000,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);

    // Conectar
    try {
      await this.publisher.connect();
      await this.subscriber.connect();

      this.logger.log(
        `📡 Redis connected: ${redisConfig.host}:${redisConfig.port}`,
      );
    } catch (error) {
      this.logger.error(`❌ Redis connection failed: ${error.message}`);
      this.logger.warn(
        "⚠️ Falling back to local-only mode (messages won't sync across servers)",
      );
      return;
    }

    // Configurar handlers de mensajes
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    // Suscribirse a todos los canales
    await this.subscriber.subscribe(
      CHANNELS.MESSAGE_NEW,
      CHANNELS.READ_RECEIPT,
      CHANNELS.TYPING,
      CHANNELS.PRESENCE,
    );

    this.logger.log('✅ Redis PubSub initialized');
  }

  async onModuleDestroy() {
    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    this.logger.log('Redis connections closed');
  }

  /**
   * Maneja los mensajes recibidos de Redis
   */
  private handleMessage(channel: string, message: string) {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case CHANNELS.MESSAGE_NEW:
          this.notifyMessageCallbacks(data);
          break;
        case CHANNELS.READ_RECEIPT:
          this.notifyReadReceiptCallbacks(data);
          break;
        case CHANNELS.TYPING:
          this.notifyTypingCallbacks(data);
          break;
        case CHANNELS.PRESENCE:
          this.notifyPresenceCallbacks(data);
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling Redis message: ${error.message}`);
    }
  }

  // ============ PUBLISH METHODS ============

  async publishMessage(event: MessageEvent): Promise<void> {
    await this.publish(CHANNELS.MESSAGE_NEW, event);
    this.logger.debug(`📤 Published message event: ${event.messageId}`);
  }

  async publishReadReceipt(event: ReadReceiptEvent): Promise<void> {
    await this.publish(CHANNELS.READ_RECEIPT, event);
    this.logger.debug(`📤 Published read receipt: ${event.messageId}`);
  }

  async publishTyping(event: TypingEvent): Promise<void> {
    await this.publish(CHANNELS.TYPING, event);
  }

  async publishPresence(event: PresenceEvent): Promise<void> {
    await this.publish(CHANNELS.PRESENCE, event);
    this.logger.debug(
      `📤 Published presence: ${event.userId} -> ${event.status}`,
    );
  }

  private async publish(channel: string, data: any): Promise<void> {
    if (!this.publisher) {
      // Si no hay conexión Redis, notificar localmente
      this.handleMessage(channel, JSON.stringify(data));
      return;
    }

    try {
      await this.publisher.publish(channel, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Error publishing to Redis: ${error.message}`);
      // Fallback local
      this.handleMessage(channel, JSON.stringify(data));
    }
  }

  // ============ SUBSCRIBE METHODS ============

  async subscribeToMessages(
    callback: (event: MessageEvent) => void,
  ): Promise<void> {
    this.messageCallbacks.push(callback);
  }

  async subscribeToReadReceipts(
    callback: (event: ReadReceiptEvent) => void,
  ): Promise<void> {
    this.readReceiptCallbacks.push(callback);
  }

  async subscribeToTyping(
    callback: (event: TypingEvent) => void,
  ): Promise<void> {
    this.typingCallbacks.push(callback);
  }

  async subscribeToPresence(
    callback: (event: PresenceEvent) => void,
  ): Promise<void> {
    this.presenceCallbacks.push(callback);
  }

  // ============ NOTIFY CALLBACKS ============

  private notifyMessageCallbacks(event: MessageEvent) {
    // Convertir fechas de strings a Date objects
    if (typeof event.createdAt === 'string') {
      event.createdAt = new Date(event.createdAt);
    }

    for (const callback of this.messageCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in message callback:', error);
      }
    }
  }

  private notifyReadReceiptCallbacks(event: ReadReceiptEvent) {
    if (typeof event.readAt === 'string') {
      event.readAt = new Date(event.readAt);
    }

    for (const callback of this.readReceiptCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in read receipt callback:', error);
      }
    }
  }

  private notifyTypingCallbacks(event: TypingEvent) {
    for (const callback of this.typingCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in typing callback:', error);
      }
    }
  }

  private notifyPresenceCallbacks(event: PresenceEvent) {
    if (typeof event.lastSeen === 'string') {
      event.lastSeen = new Date(event.lastSeen);
    }

    for (const callback of this.presenceCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in presence callback:', error);
      }
    }
  }
}
