import { Controller, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { LlmMessage } from '../../common/types';
import type { Response } from 'express';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @Req() req: any,
    @Body() body: { messages: LlmMessage[]; modelId?: string },
  ) {
    return this.chatService.chat(req.user.userId, body.messages, body.modelId);
  }

  @Post('stream')
  async chatStream(
    @Req() req: any,
    @Body() body: { messages: LlmMessage[]; modelId?: string; images?: string[] },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    
    // 将图片添加到用户消息中
    if (body.images && body.images.length > 0) {
      const lastUserMessage = body.messages.findLast(msg => msg.role === 'user');
      if (lastUserMessage) {
        lastUserMessage.images = body.images;
      }
    }
    
    await this.chatService.chatStream(req.user.userId, body.messages, body.modelId, res);
  }
}