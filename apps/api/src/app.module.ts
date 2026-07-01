import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { RedisModule } from './modules/redis/redis.module';
import { SearchModule } from './modules/search/search.module';
import { CartModule } from './modules/cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    RestaurantsModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    CouponsModule,
    NotificationsModule,
    AdminModule,
    DeliveryModule,
    RedisModule,
    SearchModule,
    CartModule,
  ],
})
export class AppModule {}
