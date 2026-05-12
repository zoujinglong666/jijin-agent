import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BehaviorService } from './behavior.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { BehaviorEvent } from '../../common/types';

@Controller('behavior')
@UseGuards(JwtAuthGuard)
export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  @Post('events')
  async recordEvent(@Req() req: any, @Body() body: { event: BehaviorEvent }) {
    await this.behaviorService.recordEvent(req.user.userId, body.event);
    return null;
  }

  @Get('state')
  async getState(@Req() req: any) {
    return this.behaviorService.getBehaviorState(req.user.userId);
  }

  @Get('count/:event/:hours')
  async getCount(@Req() req: any, @Param('event') event: BehaviorEvent, @Param('hours') hours: string) {
    return { count: await this.behaviorService.getEventCount(req.user.userId, event, parseInt(hours)) };
  }

  @Get('personality')
  async getPersonality(@Req() req: any) {
    return this.behaviorService.getPersonality(req.user.userId);
  }

  @Get('tags')
  async getTags(@Req() req: any) {
    return this.behaviorService.getTags(req.user.userId);
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.behaviorService.getStats(req.user.userId);
  }

  @Get('logs')
  async getLogs(@Req() req: any) {
    return this.behaviorService.getLogs(req.user.userId);
  }
}