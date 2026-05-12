import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { BehaviorEvent } from '../../common/types';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('run')
  async run(@Req() req: any) {
    return this.agentService.runForUser(req.user.userId);
  }

  @Get('context')
  async getContext(@Req() req: any) {
    return this.agentService.getFullContext(req.user.userId);
  }

  @Post('trigger/behavior')
  async triggerBehavior(@Req() req: any, @Body() body: { event: BehaviorEvent }) {
    const output = await this.agentService.triggerByBehavior(req.user.userId, body.event);
    return { triggered: output !== null, output };
  }

  @Get('memory/trends')
  async getTrends(@Req() req: any) {
    return this.agentService.getMemoryTrends(req.user.userId);
  }
}