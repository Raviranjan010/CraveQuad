import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { Public } from '../auth/public.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) { }

  @Get()
  @Public()
  async findAll(
    @Query('campusId') campusId?: string,
    @Query('search') search?: string,
    @Query('cuisine') cuisine?: string,
    @Query('veg') veg?: string,
    @Query('rating') rating?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const vegOnly = veg === 'true';
    const minRating = rating ? parseFloat(rating) : undefined;

    return this.restaurantsService.findAllFiltered({
      campusId,
      search,
      cuisine,
      vegOnly,
      minRating,
      sortBy,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }
}

