import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseService } from './firebase.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private firebaseService: FirebaseService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Check if the route is decorated as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authorization header is missing or malformed');
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await this.firebaseService.verifyIdToken(token);
      request.firebaseUser = decodedToken;

      // Find corresponding user in Postgres
      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: { vendor: true, deliveryPartner: true },
      });

      if (user) {
        request.user = user;
      }

      // If the route is not public and no database user exists, they must register first
      const allowNoDbUser = this.reflector.getAllAndOverride<boolean>('allowNoDbUser', [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!user && !isPublic && !allowNoDbUser) {
        throw new UnauthorizedException('User is authenticated in Firebase but not registered in PostgreSQL.');
      }

      return true;
    } catch (error) {
      if (isPublic) return true;
      console.error('Firebase authentication verification error:', error);
      throw new UnauthorizedException(error.message || 'Token verification failed');
    }
  }
}
