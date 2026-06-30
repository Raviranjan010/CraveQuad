import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;

    try {
      this.redisClient = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1, // Fail fast during local development if Redis is off
      });

      this.redisClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Successfully connected to Redis at ${host}:${port}`);
      });

      this.redisClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}. Graceful fallback active.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Failed to initialize Redis: ${err.message}. Graceful fallback active.`);
    }
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }

  /**
   * Get cached data by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.redisClient || !this.isConnected) return null;
    try {
      return await this.redisClient.get(key);
    } catch (err: any) {
      this.logger.warn(`Redis GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Set cache data with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.redisClient || !this.isConnected) return;
    try {
      if (ttlSeconds) {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * Increment a search term count in a sorted set for popular searches
   */
  async incrementSearch(query: string): Promise<void> {
    if (!this.redisClient || !this.isConnected || !query) return;
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return;
    try {
      // Key: "CC:popular_searches"
      await this.redisClient.zincrby('CC:popular_searches', 1, cleanQuery);
    } catch (err: any) {
      this.logger.warn(`Redis ZINCRBY failed for popular searches: ${err.message}`);
    }
  }

  /**
   * Retrieve the top popular search terms
   */
  async getPopularSearches(limit = 5): Promise<string[]> {
    if (!this.redisClient || !this.isConnected) return [];
    try {
      // Retrieve top query terms (score descending)
      return await this.redisClient.zrevrange('CC:popular_searches', 0, limit - 1);
    } catch (err: any) {
      this.logger.warn(`Redis ZREVRANGE failed for popular searches: ${err.message}`);
      return [];
    }
  }
}
