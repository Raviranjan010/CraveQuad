import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { RedisService } from '../redis/redis.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
    private redisService: RedisService,
  ) {}

  async send(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
  }) {
    const { userId, title, body, type } = params;

    // 1. Save in PostgreSQL Notification inbox
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
      },
    });

    // 2. Emit real-time Socket.IO event to the user's room
    try {
      this.gateway.server.to(`user-room:${userId}`).emit('notification:new', notification);
    } catch (err) {
      console.warn('Socket.IO emit failed in NotificationsService:', err);
    }

    // 3. Check Redis throttle for push notifications (e.g. throttle 5 seconds per user per type)
    const throttleKey = `CC:notif_throttle:${userId}:${type}`;
    try {
      const isThrottled = await this.redisService.get(throttleKey);

      if (isThrottled) {
        console.log(`Notification of type "${type}" for user ${userId} is throttled. Skipping FCM.`);
        return notification;
      }

      // Set throttle in Redis for 5 seconds
      await this.redisService.set(throttleKey, 'true', 5);
    } catch (err: any) {
      console.warn(`Redis throttling check failed in NotificationsService: ${err.message}`);
    }

    // 4. Send Firebase Push Notification (if user has deviceToken registered)
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { deviceToken: true },
      });

      if (user?.deviceToken && admin.apps.length > 0) {
        await admin.messaging().send({
          token: user.deviceToken,
          notification: {
            title,
            body,
          },
          data: {
            type,
            notificationId: notification.id,
          },
        });
        console.log(`Successfully sent FCM push notification to user ${userId}`);
      }
    } catch (err: any) {
      console.warn(`FCM push notification failed: ${err.message}`);
    }

    return notification;
  }

  async sendPushNotification(token: string, title: string, body: string) {
    if (admin.apps.length > 0) {
      await admin.messaging().send({
        token,
        notification: { title, body },
      });
      return { token, title, body, status: 'sent' };
    }
    return { token, title, body, status: 'mock_sent_offline' };
  }
}
