import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    // If configuration is placeholder, default to development mock auth verification
    if (
      !projectId || 
      !clientEmail || 
      !privateKey || 
      projectId === 'campus-crave-dev' || 
      privateKey.includes('MIIEvgI')
    ) {
      console.warn('Firebase configuration is missing or placeholder. Running in DEVELOPMENT MOCK Auth mode.');
      return;
    }

    try {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK successfully initialized.');
    } catch (error) {
      console.error('Firebase Admin SDK initialization failed:', error);
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.firebaseApp) {
      // Mock validation mode to allow offline test logins without remote Firebase calls
      console.log(`[MockAuth] Decoding developer token: ${token}`);
      if (token.startsWith('mock-') || token === 'mock-token') {
        const suffix = token === 'mock-token' ? 'student' : token.split('-')[1];
        const email = `${suffix}@bits.ac.in`;
        return {
          uid: token,
          email,
          email_verified: true,
          name: suffix.charAt(0).toUpperCase() + suffix.slice(1),
          iss: 'https://securetoken.google.com/mock',
          aud: 'mock',
          auth_time: Date.now() / 1000,
          sub: token,
          exp: Date.now() / 1000 + 3600,
          iat: Date.now() / 1000,
          firebase: { sign_in_provider: 'custom' },
        } as any;
      }
      throw new Error('Firebase Admin not initialized. Use token matching "mock-[name]" to bypass.');
    }
    return admin.auth().verifyIdToken(token);
  }
}
