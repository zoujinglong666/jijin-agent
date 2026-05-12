import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrowthService } from './growth.service';
import { GrowthController } from './growth.controller';
import { GrowthMetricsEntity } from '../../database/entities/growth-metrics.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([GrowthMetricsEntity])],
  controllers: [GrowthController],
  providers: [GrowthService],
  exports: [GrowthService],
})
export class GrowthModule {}