import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketModule } from '../market/market.module';
import { Fund, User, BehaviorLog, ActionRecord } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fund, User, BehaviorLog, ActionRecord]),
    MarketModule,
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}