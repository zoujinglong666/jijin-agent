import { Injectable, Logger } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private portfolioService: PortfolioService,
    private behaviorService: BehaviorService,
  ) {}

  async seedDemoData(userId: string): Promise<void> {
    this.logger.log(`Seeding demo data for user ${userId}`);

    const demoFunds = [
      { name: '诺安成长混合', code: '320007', amount: 15000, profitRate: 12.5, sector: '半导体' },
      { name: '华夏人工智能ETF联接', code: '008585', amount: 10000, profitRate: -3.2, sector: 'AI' },
      { name: '易方达稳健收益债券', code: '110007', amount: 20000, profitRate: 4.1, sector: '债券' },
    ];

    for (const fund of demoFunds) {
      try {
        await this.portfolioService.addFund(userId, fund as any);
      } catch {
        this.logger.warn(`Seed fund ${fund.code} failed, skipping`);
      }
    }

    const demoEvents: Array<import('../../common/types').BehaviorEvent> = [
      'APP_OPEN', 'PORTFOLIO_VIEW', 'PORTFOLIO_VIEW', 'REFRESH',
    ];
    for (const event of demoEvents) {
      try {
        await this.behaviorService.recordEvent(userId, event);
      } catch {
        this.logger.warn(`Seed event ${event} failed, skipping`);
      }
    }

    this.logger.log(`Demo data seeded for user ${userId}`);
  }
}
