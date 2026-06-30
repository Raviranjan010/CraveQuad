import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { VendorStatus } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async search(query: string, campusId?: string) {
    const trimmedQuery = query ? query.trim().toLowerCase() : '';
    if (!trimmedQuery) {
      return { vendors: [], menuItems: [] };
    }

    const cacheKey = `CC:search:${campusId || 'global'}:${trimmedQuery}`;

    // 1. Try to read from Redis cache
    try {
      const cachedResults = await this.redisService.get(cacheKey);
      if (cachedResults) {
        // Increment search statistics asynchronously without blocking response
        this.redisService.incrementSearch(trimmedQuery).catch((err) => {
          this.logger.warn(`Failed to increment search count for "${trimmedQuery}": ${err.message}`);
        });
        return JSON.parse(cachedResults);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to retrieve search results from cache: ${err.message}`);
    }

    // 2. Fetch from Postgres DB
    this.logger.log(`Cache miss. Fetching search results from database for query: "${trimmedQuery}"`);
    
    // Find matching vendors/restaurants
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: VendorStatus.APPROVED,
        ...(campusId && { campusId }),
        OR: [
          { businessName: { contains: trimmedQuery, mode: 'insensitive' } },
          { description: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        menuCategories: {
          select: {
            name: true,
          },
        },
      },
    });

    // Find matching menu items
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        vendor: {
          status: VendorStatus.APPROVED,
          ...(campusId && { campusId }),
        },
        OR: [
          { name: { contains: trimmedQuery, mode: 'insensitive' } },
          { description: { contains: trimmedQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            avgRating: true,
          },
        },
      },
    });

    const results = { vendors, menuItems };

    // 3. Cache the results in Redis (TTL: 5 minutes = 300 seconds)
    try {
      await this.redisService.set(cacheKey, JSON.stringify(results), 300);
      await this.redisService.incrementSearch(trimmedQuery);
    } catch (err: any) {
      this.logger.warn(`Failed to store search results or statistics in Redis: ${err.message}`);
    }

    return results;
  }

  async getPopularSearches(limit = 5): Promise<string[]> {
    try {
      return await this.redisService.getPopularSearches(limit);
    } catch (err: any) {
      this.logger.warn(`Failed to retrieve popular searches: ${err.message}`);
      return [];
    }
  }
}
