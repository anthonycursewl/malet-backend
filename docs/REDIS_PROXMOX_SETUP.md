# 🔧 Guía de Configuración de Redis en Proxmox

Esta guía te ayudará a configurar Redis en tu homelab con Proxmox para el sistema de mensajería de Malet.

---

## 📋 Requisitos del Servidor

### Hardware Mínimo Recomendado

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 512 MB | 1-2 GB |
| **Disco** | 5 GB SSD | 10 GB SSD |
| **Red** | 100 Mbps | 1 Gbps |

> 💡 Redis es muy eficiente en memoria. Para tu caso de uso (PubSub de mensajería), 512MB-1GB es más que suficiente.

### Puertos Necesarios

| Puerto | Servicio | Descripción |
|--------|----------|-------------|
| 6379 | Redis | Puerto principal de Redis |
| (opcional) 16379 | Redis Cluster | Si usas clustering en el futuro |

---

## 🐳 Opción 1: LXC Container (Recomendado)

La opción más ligera y eficiente para tu homelab.

### Paso 1: Crear LXC Container

```bash
# En el shell de Proxmox
pct create 200 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname redis-server \
  --memory 1024 \
  --cores 2 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --storage local-lvm \
  --rootfs local-lvm:5 \
  --unprivileged 1 \
  --features nesting=1 \
  --start 1
```

> Nota: Reemplaza la IP y el template según tu configuración.

### Paso 2: Acceder al Container

```bash
# Desde Proxmox
pct enter 200

# O via SSH
ssh root@<IP_DEL_CONTAINER>
```

### Paso 3: Instalar Redis

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Redis
apt install redis-server -y

# Verificar instalación
redis-cli ping
# Debería responder: PONG
```

### Paso 4: Configurar Redis

```bash
# Editar configuración
nano /etc/redis/redis.conf
```

Cambios importantes:

```conf
# 1. Permitir conexiones externas (cambiar de 127.0.0.1)
bind 0.0.0.0

# 2. Establecer contraseña (IMPORTANTE para seguridad)
requirepass tu_contraseña_segura_aqui

# 3. Persistencia (opcional, pero recomendado)
appendonly yes
appendfsync everysec

# 4. Límite de memoria (ajustar según tu RAM asignada)
maxmemory 512mb
maxmemory-policy allkeys-lru

# 5. Timeout para conexiones inactivas
timeout 300

# 6. Cliente máximos
maxclients 1000

# 7. Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### Paso 5: Reiniciar y Habilitar Redis

```bash
# Reiniciar servicio
systemctl restart redis-server

# Habilitar en arranque
systemctl enable redis-server

# Verificar estado
systemctl status redis-server
```

### Paso 6: Probar Conexión

```bash
# Desde el mismo servidor
redis-cli -a tu_contraseña_segura_aqui ping

# Desde otro servidor en la red
redis-cli -h <IP_REDIS> -p 6379 -a tu_contraseña_segura_aqui ping
```

---

## 🖥️ Opción 2: VM con Docker

Si prefieres usar Docker para gestionar Redis.

### Paso 1: Crear VM

Crea una VM en Proxmox con:
- Ubuntu/Debian Server
- 2 vCPU, 2GB RAM
- 20GB disco

### Paso 2: Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y
```

### Paso 3: Crear docker-compose.yml

```yaml
# ~/redis/docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: malet-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    environment:
      - TZ=America/Caracas  # Ajusta tu timezone
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
```

### Paso 4: Crear redis.conf

```bash
# ~/redis/redis.conf
bind 0.0.0.0
port 6379
requirepass tu_contraseña_segura_aqui

# Persistencia
appendonly yes
appendfsync everysec

# Memoria
maxmemory 512mb
maxmemory-policy allkeys-lru

# Logging
loglevel notice

# Seguridad adicional
protected-mode no
```

### Paso 5: Iniciar Redis

```bash
cd ~/redis
docker compose up -d

# Verificar
docker compose logs -f
docker compose exec redis redis-cli -a tu_contraseña_segura_aqui ping
```

---

## 🔒 Configuración de Firewall

### En Proxmox (UFW)

```bash
# Permitir Redis solo desde tu red interna
ufw allow from 192.168.1.0/24 to any port 6379

# O solo desde IPs específicas de tus servidores
ufw allow from 192.168.1.100 to any port 6379
ufw allow from 192.168.1.101 to any port 6379
```

### En iptables

```bash
# Permitir desde red local
iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

---

## 🌐 Configuración de Red

### Asignar IP Estática (Recomendado)

En el container LXC o VM, edita:

```bash
# /etc/netplan/00-installer-config.yaml (Ubuntu)
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.50/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Aplica:
```bash
netplan apply
```

---

## ⚙️ Variables de Entorno en Malet Backend

Una vez que Redis esté funcionando, configura estas variables en tu `.env`:

```env
# Redis Configuration
REDIS_HOST=192.168.1.50   # IP de tu servidor Redis
REDIS_PORT=6379
REDIS_PASSWORD=tu_contraseña_segura_aqui
REDIS_DB=0

# WebSocket Configuration
WS_CORS_ORIGIN=*
```

---

## 📊 Monitoreo

### Comandos útiles de Redis

```bash
# Información del servidor
redis-cli -a password INFO

# Memoria utilizada
redis-cli -a password INFO memory

# Clientes conectados
redis-cli -a password CLIENT LIST

# Monitorear comandos en tiempo real
redis-cli -a password MONITOR

# Estadísticas de PubSub
redis-cli -a password PUBSUB CHANNELS
redis-cli -a password PUBSUB NUMSUB messaging:*
```

### Instalar Redis Commander (Panel Web Opcional)

```yaml
# Agregar a docker-compose.yml
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: redis-commander
    restart: unless-stopped
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=tu_contraseña_segura_aqui
    ports:
      - "8081:8081"
    depends_on:
      - redis
```

Accede en: `http://<IP_SERVIDOR>:8081`

---

## 🔄 Backup y Persistencia

### Backup Manual

```bash
# Crear snapshot
redis-cli -a password BGSAVE

# Copiar el archivo RDB
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Backup Automatizado

```bash
# Crontab para backup diario
0 2 * * * redis-cli -a password BGSAVE && cp /var/lib/redis/dump.rdb /backup/redis-$(date +\%Y\%m\%d).rdb
```

---

## 🧪 Verificar Conexión desde Malet

Una vez configurado Redis, verifica que Malet puede conectarse:

```bash
# En el servidor de Malet
npm run start:dev

# Deberías ver en los logs:
# 📡 Redis connected: 192.168.1.50:6379
# ✅ Redis PubSub initialized
```

---

## 🚀 Arquitectura Multi-Servidor

Una vez que Redis esté funcionando, puedes escalar así:

```
┌─────────────────┐     ┌─────────────────┐
│   Malet API 1   │     │   Malet API 2   │
│  (Servidor 1)   │     │  (Servidor 2)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
             ┌───────▼───────┐
             │     REDIS     │
             │ (Proxmox LXC) │
             │  192.168.1.50 │
             └───────────────┘
```

Los usuarios conectados a Server 1 recibirán mensajes de usuarios en Server 2 gracias al PubSub de Redis.

---

## ❓ Troubleshooting

### Error: Connection refused

```bash
# Verificar que Redis está escuchando
netstat -tlnp | grep 6379

# Verificar firewall
ufw status
iptables -L -n
```

### Error: NOAUTH Authentication required

```bash
# Asegúrate de pasar la contraseña
redis-cli -a tu_contraseña ping
```

### Error: max number of clients reached

```bash
# Aumentar maxclients en redis.conf
maxclients 10000
```

---

## 📝 Resumen de Configuración

| Configuración | Valor |
|---------------|-------|
| Host | 192.168.1.50 (tu IP) |
| Puerto | 6379 |
| Password | (genera una segura) |
| Memoria | 512MB - 1GB |
| Persistencia | AOF (appendonly yes) |

---

*Última actualización: Diciembre 2024*
