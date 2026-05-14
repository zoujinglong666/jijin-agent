import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BehaviorModule } from '../behavior/behavior.module';

@Module({
  imports: [PortfolioModule, BehaviorModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
