import { Controller, Get, Param, Query } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.menuService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }
}
