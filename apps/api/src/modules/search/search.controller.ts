import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../auth/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  async search(
    @Query('q') q?: string,
    @Query('campusId') campusId?: string,
  ) {
    return this.searchService.search(q || '', campusId);
  }

  @Get('popular')
  @Public()
  async getPopular(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.searchService.getPopularSearches(parsedLimit);
  }
}
