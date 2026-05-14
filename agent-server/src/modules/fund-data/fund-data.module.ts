import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundDataService } from './fund-data.service';
import { FundDataController } from './fund-data.controller';
import { FundCacheEntity } from '../../database/entities/fund-cache.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([FundCacheEntity])],
  controllers: [FundDataController],
  providers: [FundDataService],
  exports: [FundDataService],
})
export class FundDataModule {}
