import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    
    // Standard Redis client connection
    this.redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1, // Fail fast during local development if Redis is off
    });
    
    this.redis.on('error', (err) => {
      console.warn('Redis rate-limiter connection error. Bypassing rate limit for local development.', err.message);
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers['x-forwarded-for'] || '127.0.0.1';
    const email = request.body?.email || 'anonymous';
    
    // Construct rate limit bucket key
    const key = `rate:auth:${ip}:${email}`;

    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 600); // 10 minutes window
      }

      if (count > 5) {
        throw new HttpException(
          'Too many authentication attempts. Please try again after 10 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      // If Redis connection is broken, log warning and bypass so development is not blocked
      if (err instanceof HttpException) throw err;
      console.warn('Redis rate limiter check failed. Bypassing rate limit check.', err);
    }

    return true;
  }
}
