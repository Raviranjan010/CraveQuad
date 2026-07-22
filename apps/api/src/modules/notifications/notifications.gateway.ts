import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayInit, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  SubscribeMessage 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    console.log('Socket.IO Gateway successfully initialized.');
  }

  handleConnection(client: Socket) {
    console.log(`Client socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:admin')
  handleJoinAdmin(client: Socket) {
    client.join('admin-room');
    console.log(`Socket client joined admin-room: ${client.id}`);
    return { status: 'joined' };
  }

  @SubscribeMessage('join:user')
  handleJoinUser(client: Socket, data: { userId: string }) {
    if (data?.userId) {
      client.join(`user-room:${data.userId}`);
      console.log(`Socket client joined user-room:${data.userId}`);
      return { status: 'joined' };
    }
  }

  @SubscribeMessage('join:vendor')
  handleJoinVendor(client: Socket, data: { vendorId: string }) {
    if (data?.vendorId) {
      client.join(`vendor-room:${data.vendorId}`);
      console.log(`Socket client joined vendor-room:${data.vendorId}`);
      return { status: 'joined' };
    }
  }

  @SubscribeMessage('join:order')
  handleJoinOrder(client: Socket, data: { orderId: string }) {
    if (data?.orderId) {
      client.join(`order-room:${data.orderId}`);
      console.log(`Socket client joined order-room:${data.orderId}`);
      return { status: 'joined' };
    }
  }

  // Broadcaster utility for other modules
  emitNewVendorRegistered(vendor: any) {
    console.log('Emitting live vendor:registered alert to admin-room');
    this.server.to('admin-room').emit('vendor:registered', vendor);
  }

  emitVendorStatusUpdated(vendorId: string, status: string) {
    console.log(`Emitting status update alert: vendor ${vendorId} is now ${status}`);
    this.server.emit(`vendor:status:${vendorId}`, { vendorId, status });
  }

  emitOrderPlaced(order: any) {
    console.log(`Emitting order:placed to vendor-room:${order.vendorId}`);
    this.server.to(`vendor-room:${order.vendorId}`).emit('order:placed', order);
  }

  emitOrderStatusUpdated(orderId: string, status: string, userId: string) {
    console.log(`Emitting order:status update: order ${orderId} is now ${status}`);
    this.server.to(`order-room:${orderId}`).emit('order:status', { orderId, status });
    this.server.to(`user-room:${userId}`).emit('order:status', { orderId, status });
  }
}
