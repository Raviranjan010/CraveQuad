import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  
  async validateFirebaseToken(token: string) {
    // Boilerplate for firebase verification
    return { token, valid: true };
  }
}
