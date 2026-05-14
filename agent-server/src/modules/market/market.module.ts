import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fund, User } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fund, User]),
    HttpModule,
  ],
  providers: [MarketService],
  controllers: [MarketController],
  exports: [MarketService],
})
export class MarketModule {}