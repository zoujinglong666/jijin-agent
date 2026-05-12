import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehaviorService } from './behavior.service';
import { BehaviorController } from './behavior.controller';
import { BehaviorLog } from '../../database/entities/behavior-log.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';
import { Fund } from '../../database/entities/fund.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([BehaviorLog, ActionRecord, Fund])],
  controllers: [BehaviorController],
  providers: [BehaviorService],
  exports: [BehaviorService],
})
export class BehaviorModule {}