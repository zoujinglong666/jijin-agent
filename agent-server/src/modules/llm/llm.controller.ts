import { Controller, Post, Body, Get, Put, Req, UseGuards, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LlmService } from './llm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { LlmMessage } from '../../common/types';
import type { Response } from 'express';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';
import { User } from '../../database/entities/user.entity';
import { Repository } from 'typeorm';

@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  @Post('chat')
  async chat(@Req() req: any, @Body() body: { messages: LlmMessage[]; modelId?: string }) {
    return this.llmService.chat(body.messages, body.modelId);
  }

  @Post('chat/stream')
  async chatStream(
    @Req() req: any,
    @Body() body: { messages: LlmMessage[]; modelId?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    await this.llmService.chatStream(body.messages, body.modelId, res);
  }

  @Get('models')
  getModels() {
    return this.llmService.getAvailableModels();
  }

  @Get('model')
  async getCurrentModel(@Req() req: any) {
    const user = await this.userRepository.findOne({ where: { id: req.user.userId } });
    return { modelId: user?.llmModel || 'deepseek-v4-pro' };
  }

  @Put('model')
  async setModel(@Req() req: any, @Body() body: { modelId: string }) {
    const models = this.llmService.getAvailableModels();
    const found = models.find(m => m.id === body.modelId);
    if (!found) {
      throw new BizException(ErrorCode.MODEL_NOT_FOUND, '模型不存在');
    }
    await this.userRepository.update({ id: req.user.userId }, { llmModel: body.modelId });
    return { modelId: body.modelId, model: found };
  }
}