import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { AllowNoDbUser } from './allow-no-db-user.decorator';
import { RateLimiterGuard } from './rate-limiter.guard';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

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
