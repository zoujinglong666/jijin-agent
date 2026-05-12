import { Injectable } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
export class PortfolioGateway {
  @WebSocketServer()
  server: Server;

  notifyPortfolioUpdate(userId: string, data: any) {
    this.server?.to(userId)?.emit('portfolio:update', data);
  }
}
