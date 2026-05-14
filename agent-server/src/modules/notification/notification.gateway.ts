import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'] },
})
export class NotificationGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(private notificationService: NotificationService) {}

  onModuleInit() {
    this.notificationService.setWebSocketServer(this.server);

    this.server.on('connection', (client) => {
      const userId = client.handshake.query.userId as string;
      if (userId) {
        client.join(`user_${userId}`);
      }
    });
  }
}
