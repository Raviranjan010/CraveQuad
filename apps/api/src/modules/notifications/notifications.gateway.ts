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

  // Broadcaster utility for other modules
  emitNewVendorRegistered(vendor: any) {
    console.log('Emitting live vendor:registered alert to admin-room');
    this.server.to('admin-room').emit('vendor:registered', vendor);
  }

  emitVendorStatusUpdated(vendorId: string, status: string) {
    console.log(`Emitting status update alert: vendor ${vendorId} is now ${status}`);
    this.server.emit(`vendor:status:${vendorId}`, { vendorId, status });
  }
}
