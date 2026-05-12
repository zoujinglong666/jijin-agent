import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Fund as FundEntity } from '../../database/entities/fund.entity';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('funds')
  async getFunds(@Req() req: any) {
    return this.portfolioService.getFunds(req.user.userId);
  }

  @Post('funds')
  async addFund(@Req() req: any, @Body() body: Omit<FundEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.portfolioService.addFund(req.user.userId, body);
  }

  @Put('funds/:fundId')
  async updateFund(@Req() req: any, @Param('fundId') fundId: string, @Body() body: Partial<FundEntity>) {
    return this.portfolioService.updateFund(req.user.userId, fundId, body);
  }

  @Delete('funds/:fundId')
  async deleteFund(@Req() req: any, @Param('fundId') fundId: string) {
    return { success: await this.portfolioService.deleteFund(req.user.userId, fundId) };
  }

  @Get('analysis')
  async getAnalysis(@Req() req: any) {
    return {
      totalAmount: await this.portfolioService.getTotalAmount(req.user.userId),
      sectorRatios: await this.portfolioService.getSectorRatios(req.user.userId),
      highVolatilityRatio: await this.portfolioService.getHighVolatilityRatio(req.user.userId),
      maxSectorConcentration: await this.portfolioService.getMaxSectorConcentration(req.user.userId),
    };
  }

  @Get('actions')
  async getActions(@Req() req: any, @Query('fundId') fundId?: string) {
    return this.portfolioService.getActions(req.user.userId, fundId);
  }

  @Post('actions')
  async addAction(@Req() req: any, @Body() body: { fundId: string; actionType: string; ratio: number; reason: string }) {
    return this.portfolioService.addAction(req.user.userId, body);
  }

  @Post('import')
  async importFunds(@Req() req: any, @Body() body: { funds: Omit<FundEntity, 'id' | 'createdAt' | 'updatedAt'>[] }) {
    return this.portfolioService.importFunds(req.user.userId, body.funds);
  }
}