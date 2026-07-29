import { 
  Controller, 
  Get, 
  Param, 
  Query, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  UseGuards, 
  Req
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { Public } from '../auth/public.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) { }

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

  // Categories CRUD endpoints placed before general :id parameters to prevent routing conflicts
  @Post('categories')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async createCategory(@Body('name') name: string, @Req() req: any) {
    return this.menuService.createCategory(name, req.user.id);
  }

  @Patch('categories/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async updateCategory(
    @Param('id') id: string,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    return this.menuService.updateCategory(id, name, req.user.id);
  }

  @Delete('categories/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.menuService.deleteCategory(id, req.user.id);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.menuService.findOne(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async createMenuItem(@Body() body: any, @Req() req: any) {
    return this.menuService.create(body, req.user.id);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async updateMenuItem(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.menuService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async deleteMenuItem(@Param('id') id: string, @Req() req: any) {
    return this.menuService.delete(id, req.user.id);
  }
}
