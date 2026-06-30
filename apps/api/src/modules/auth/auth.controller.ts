import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AllowNoDbUser } from './allow-no-db-user.decorator';
import { Public } from './public.decorator';
import { RateLimiterGuard } from './rate-limiter.guard';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  @Get('campuses')
  @Public()
  async getCampuses() {
    return this.prisma.campus.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post('register')
  @UseGuards(RateLimiterGuard, FirebaseAuthGuard)
  @AllowNoDbUser()
  async register(@Req() req: any, @Body() body: { name: string; campusId: string; role?: Role }) {
    return this.authService.registerUser(req.firebaseUser, body);
  }

  @Post('register-vendor')
  @UseGuards(RateLimiterGuard, FirebaseAuthGuard)
  @AllowNoDbUser()
  async registerVendor(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      businessName: string;
      description?: string;
      campusId: string;
      openingHours: any;
      logoUrl?: string;
      bannerUrl?: string;
      licenseNumber?: string;
      bankDetails?: any;
    },
  ) {
    const result = await this.authService.registerVendor(req.firebaseUser, body);

    // Emit live WebSocket update to admin dashboards
    this.notificationsGateway.emitNewVendorRegistered(result.vendor);

    return result;
  }
}
