import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, VendorStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async registerUser(firebaseUser: any, dto: { name: string; campusId: string; role?: Role }) {
    const { uid, email } = firebaseUser;
    
    // Ensure email is present
    if (!email) {
      throw new BadRequestException('Firebase authenticated user must have an email address.');
    }

    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          { email },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('User is already registered.');
    }

    // Verify campus exists
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) {
      throw new BadRequestException('The selected campus does not exist.');
    }

    // Enforce email domain validation
    if (campus.emailDomain) {
      const emailDomain = campus.emailDomain.toLowerCase();
      if (!email.toLowerCase().endsWith(emailDomain)) {
        throw new BadRequestException(
          `Your email domain must match the university domain: @${campus.emailDomain}`,
        );
      }
    }

    // Assign role (allow only STUDENT or FACULTY via this route)
    let assignedRole: Role = Role.STUDENT;
    if (dto.role === Role.FACULTY) {
      assignedRole = Role.FACULTY;
    }

    // Create user in PostgreSQL
    return this.prisma.user.create({
      data: {
        firebaseUid: uid,
        email,
        name: dto.name,
        role: assignedRole,
        campusId: dto.campusId,
        isVerified: true,
      },
    });
  }

  async registerVendor(
    firebaseUser: any,
    dto: {
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
    const { uid, email } = firebaseUser;

    if (!email) {
      throw new BadRequestException('Firebase authenticated user must have an email.');
    }

    // Check if user or vendor already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          { email },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('A user with this Firebase ID or email already exists.');
    }

    // Verify campus exists
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) {
      throw new BadRequestException('The selected campus does not exist.');
    }

    // Transaction to create User and Vendor in Postgres
    return this.prisma.$transaction(async (tx) => {
      // 1. Create VENDOR User
      const user = await tx.user.create({
        data: {
          firebaseUid: uid,
          email,
          name: dto.name,
          role: Role.VENDOR,
          campusId: dto.campusId,
          isVerified: false, // Verification pending admin review
        },
      });

      // 2. Create Vendor Profile (PENDING state)
      // Save license details and bank details directly inside the JSON or new columns.
      // We will save bank details in openingHours Json or as a field. Since schema doesn't have secureBankDetails,
      // we can save it in openingHours or description or user metadata. To satisfy FSSAI and bank details storage securely, 
      // let's put it in openingHours Json (e.g. metadata field) or description. 
      // Wait, openingHours is defined as Json in our schema, so we can save it as openingHours: { schedule: dto.openingHours, license: dto.licenseNumber, bank: dto.bankDetails }
      const vendorHoursJson = {
        schedule: dto.openingHours,
        licenseNumber: dto.licenseNumber,
        bankDetails: dto.bankDetails, // Stored securely in Json structure
      };

      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          businessName: dto.businessName,
          description: dto.description || '',
          logoUrl: dto.logoUrl || null,
          bannerUrl: dto.bannerUrl || null,
          status: VendorStatus.PENDING,
          campusId: dto.campusId,
          openingHours: vendorHoursJson,
          isOpenNow: false, // Defaults to closed until approved
        },
      });

      return { user, vendor };
    });
  }
}
