import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getProfile(@Req() req: any) {
    // req.user is set by the FirebaseAuthGuard
    return req.user;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
