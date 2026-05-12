import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { StressTestScenario } from '../../common/types';

@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('snapshot')
  async getSnapshot(@Req() req: any) {
    return this.riskService.calculateRisk(req.user.userId);
  }

  @Get('scenarios')
  getScenarios() {
    return this.riskService.getDefaultScenarios();
  }

  @Get('alerts')
  async getAlerts(@Req() req: any) {
    return this.riskService.getAlerts(req.user.userId);
  }

  @Post('stress-test')
  async runStressTest(@Req() req: any, @Body() scenario: StressTestScenario) {
    return this.riskService.runStressTest(req.user.userId, scenario);
  }

  @Get('history')
  async getHistory(@Req() req: any) {
    return this.riskService.getHistory(req.user.userId);
  }
}