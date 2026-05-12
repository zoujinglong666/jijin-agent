import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioGateway } from './portfolio.gateway';
import { Fund } from '../../database/entities/fund.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Fund, ActionRecord])],
  controllers: [PortfolioController],
  providers: [PortfolioService, PortfolioGateway],
  exports: [PortfolioService],
})
export class PortfolioModule {}
