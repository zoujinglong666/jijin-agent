import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskService } from './risk.service';
import { RiskController } from './risk.controller';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BehaviorModule } from '../behavior/behavior.module';
import { NewsModule } from '../news/news.module';
import { RiskSnapshot } from '../../database/entities/risk-snapshot.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([RiskSnapshot]), PortfolioModule, BehaviorModule, NewsModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
