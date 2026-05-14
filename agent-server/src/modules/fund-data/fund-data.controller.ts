import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { FundDataService } from './fund-data.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fund-data')
@UseGuards(JwtAuthGuard)
export class FundDataController {
  constructor(private readonly fundDataService: FundDataService) {}

  @Get('search')
  async search(@Query('keyword') keyword: string, @Query('limit') limit?: string) {
    const results = await this.fundDataService.search(keyword, limit ? parseInt(limit) : 10);
    return { results };
  }

  @Get('detail')
  async getDetail(@Query('code') code: string) {
    const detail = await this.fundDataService.getFundDetail(code);
    return detail;
  }
}
