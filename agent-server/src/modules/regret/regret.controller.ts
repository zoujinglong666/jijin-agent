import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RegretService } from './regret.service';

@Controller('regret')
@UseGuards(JwtAuthGuard)
export class RegretController {
  constructor(private readonly regretService: RegretService) {}

  @Get('scenarios')
  getScenarios() {
    return this.regretService.getScenarios();
  }

  @Post('simulate')
  async runSimulation(@Req() req: any, @Body() body: { scenarioId: string }) {
    return this.regretService.runSimulation(req.user.userId, body.scenarioId);
  }
}