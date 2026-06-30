import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  UseGuards, 
  Req, 
  ForbiddenException, 
  Query 
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, VendorStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // 1. Get current vendor profile
  @Get('me')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async getMyProfile(@Req() req: any) {
    return this.vendorsService.getProfileByUserId(req.user.id);
  }

  // 2. Get current vendor dashboard stats (requires APPROVED status)
  @Get('me/dashboard')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async getMyDashboard(@Req() req: any) {
    const profile = await this.vendorsService.getProfileByUserId(req.user.id);
    if (profile.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException('Your vendor profile is not approved yet.');
    }
    return this.vendorsService.getDashboard(profile.id);
  }

  // 3. Self-service profile updates
  @Patch('me')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  async updateMyProfile(
    @Req() req: any,
    @Body()
    body: {
      businessName?: string;
      description?: string;
      logoUrl?: string;
      bannerUrl?: string;
      isOpenNow?: boolean;
      openingHours?: any;
    },
  ) {
    const profile = await this.vendorsService.getProfileByUserId(req.user.id);
    if (profile.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException('You cannot update profile details until approved.');
    }
    return this.vendorsService.updateProfile(profile.id, body);
  }

  // 4. Admin endpoint: List all vendors with optional filters
  @Get()
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async listAllVendors(
    @Query('status') status?: VendorStatus,
    @Query('campusId') campusId?: string,
  ) {
    return this.vendorsService.findAllVendors({ status, campusId });
  }

  // 5. Admin endpoint: Approve/Reject/Suspend vendor
  @Patch(':id/status')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: VendorStatus,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    const result = await this.vendorsService.updateVendorStatus(id, status, rejectionReason);
    
    // Broadcast status change to clients via socket
    this.notificationsGateway.emitVendorStatusUpdated(id, status);

    return result;
  }
}
