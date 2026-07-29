import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.user.findUnique({ 
      where: { id },
      include: { campus: true, vendor: true, deliveryPartner: true } 
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { campus: true }
    });
  }

  async updateDeviceToken(id: string, deviceToken: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deviceToken },
    });
  }
}
