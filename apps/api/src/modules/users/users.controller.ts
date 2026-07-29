import { Controller, Get, Param, UseGuards, Req, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getProfile(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  async updateProfile(
    @Req() req: any,
    @Body() body: { name?: string; phone?: string },
  ) {
    return this.usersService.update(req.user.id, body);
  }

  @Patch('me/device-token')
  @UseGuards(FirebaseAuthGuard)
  async updateDeviceToken(
    @Req() req: any,
    @Body('token') token: string,
  ) {
    return this.usersService.updateDeviceToken(req.user.id, token);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
