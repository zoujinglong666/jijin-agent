import { Controller, Get, Post, Param, Query, UseGuards, Req, Body } from '@nestjs/common';
import { MarketService, MarketAlert } from './market.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('市场行情')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('fund/:code')
  @ApiOperation({ summary: '获取基金实时数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getFundData(
    @Param('code') code: string,
    @Query('forceRefresh') forceRefresh?: boolean,
  ) {
    const data = await this.marketService.getFundQuote(code);
    return { data };
  }

  @Get('funds')
  @ApiOperation({ summary: '批量获取基金实时数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getFundsData(
    @Query('codes') codes: string,
    @Query('forceRefresh') forceRefresh?: boolean,
  ) {
    const codeList = codes.split(',');
    const data = await this.marketService.getMultipleFundQuotes(codeList);
    return { data };
  }

  @Get('sector/:sector')
  @ApiOperation({ summary: '获取板块实时数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSectorData(
    @Param('sector') sector: string,
    @Query('forceRefresh') forceRefresh?: boolean,
  ) {
    const data = await this.marketService.getFundQuote(sector);
    return { data };
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取市场异动提醒' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMarketAlerts(@Req() req: any) {
    const userId = req.user.userId;
    const alerts = await this.marketService.getMarketAlerts(userId);
    return { alerts };
  }

  @Post('alerts/check')
  @ApiOperation({ summary: '检查市场异动' })
  @ApiResponse({ status: 200, description: '检查完成' })
  async checkMarketAlerts(@Req() req: any) {
    const userId = req.user.userId;
    const alerts = await this.marketService.getMarketAlerts(userId);
    return { alerts };
  }

  @Post('snapshot')
  @ApiOperation({ summary: '创建投资组合快照' })
  @ApiResponse({ status: 200, description: '创建成功' })
  async createPortfolioSnapshot(@Req() req: any) {
    const userId = req.user.userId;
    const snapshot = await this.marketService.getUserPortfolioSnapshot(userId);
    return { snapshot };
  }

  @Get('snapshots')
  @ApiOperation({ summary: '获取投资组合快照列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPortfolioSnapshots(@Req() req: any) {
    const userId = req.user.userId;
    const snapshot = await this.marketService.getUserPortfolioSnapshot(userId);
    return { snapshots: snapshot ? [snapshot] : [] };
  }

  @Get('snapshot/:id')
  @ApiOperation({ summary: '获取投资组合快照详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPortfolioSnapshot(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    const snapshot = await this.marketService.getUserPortfolioSnapshot(userId);
    return { snapshot };
  }
}