import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './common/logger/logger.module';
import { AuthModule } from './modules/auth/auth.module';
import { AgentModule } from './modules/agent/agent.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { BehaviorModule } from './modules/behavior/behavior.module';
import { RiskModule } from './modules/risk/risk.module';
import { NewsModule } from './modules/news/news.module';
import { LlmModule } from './modules/llm/llm.module';
import { RegretModule } from './modules/regret/regret.module';
import { GrowthModule } from './modules/growth/growth.module';
import { ChatModule } from './modules/chat/chat.module';
import { HealthModule } from './modules/health/health.module';
import { FundDataModule } from './modules/fund-data/fund-data.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SyncModule } from './modules/sync/sync.module';
import { MarketModule } from './modules/market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    LoggerModule,
    AuthModule,
    AgentModule,
    PortfolioModule,
    BehaviorModule,
    RiskModule,
    NewsModule,
    LlmModule,
    RegretModule,
    GrowthModule,
    ChatModule,
    HealthModule,
    FundDataModule,
    NotificationModule,
    SyncModule,
    MarketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}