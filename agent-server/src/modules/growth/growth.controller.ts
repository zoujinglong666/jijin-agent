import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('growth')
@UseGuards(JwtAuthGuard)
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('metrics')
  async getMetrics(@Req() req: any) {
    return this.growthService.getMetrics(req.user.userId);
  }

  @Put('metrics')
  async updateMetrics(@Req() req: any, @Body() body: { stableDays?: number; riskControlRate?: number; emotionStability?: number; longTermHoldIndex?: number }) {
    return this.growthService.updateMetrics(req.user.userId, body);
  }
}