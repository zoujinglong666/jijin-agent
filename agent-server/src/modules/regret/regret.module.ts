import { Module } from '@nestjs/common';
import { RegretController } from './regret.controller';
import { RegretService } from './regret.service';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BehaviorModule } from '../behavior/behavior.module';

@Module({
  imports: [PortfolioModule, BehaviorModule],
  controllers: [RegretController],
  providers: [RegretService],
  exports: [RegretService],
})
export class RegretModule {}