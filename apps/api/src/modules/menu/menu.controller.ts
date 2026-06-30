import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { Public } from '../auth/public.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Public()
  async findByRestaurant(
    @Query('restaurantId') restaurantId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isVeg') isVeg?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const isVegBool = isVeg === 'true' ? true : isVeg === 'false' ? false : undefined;

    return this.menuService.findFiltered({
      restaurantId,
      categoryId,
      search,
      isVeg: isVegBool,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }
}
