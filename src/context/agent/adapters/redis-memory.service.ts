import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { MemoryService } from '../interfaces/memory.service.interface';
import { ModelMessage } from '../interfaces/model-client.interface';

@Injectable()
export class RedisMemoryService implements MemoryService, OnModuleInit {
  private redis: Redis;
  private readonly logger = new Logger(RedisMemoryService.name);

  onModuleInit() {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      lazyConnect: true,
    } as any;

    this.redis = new Redis(redisConfig);
    this.redis
      .connect()
      .then(() => this.logger.log('Connected to Redis for Agent memory'))
      .catch((e) =>
        this.logger.error(
          'Redis connect failed for Agent memory: ' + e.message,
        ),
      );
  }

  private key(userId: string, sessionId: string) {
    return `agent:mem:${userId}:${sessionId}`;
  }

  async getSessionContext(
    userId: string,
    sessionId: string,
    limit = 20,
  ): Promise<ModelMessage[]> {
    const raw = await this.redis.lrange(
      this.key(userId, sessionId),
      -limit,
      -1,
    );
    return raw.map((r) => JSON.parse(r) as ModelMessage);
  }

  async appendSessionMessages(
    userId: string,
    sessionId: string,
    messages: ModelMessage[],
  ): Promise<void> {
    if (!messages || messages.length === 0) return;
    const key = this.key(userId, sessionId);
    const values = messages.map((m) => JSON.stringify(m));
    await this.redis.rpush(key, ...values);
    // set TTL for session context (24h)
    await this.redis.expire(key, 60 * 60 * 24);
  }
}
