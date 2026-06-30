import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async sendPushNotification(token: string, title: string, body: string) {
    // Boilerplate FCM notification trigger
    return { token, title, body, status: 'sent' };
  }
}
