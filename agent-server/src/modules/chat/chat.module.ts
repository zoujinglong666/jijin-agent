import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { User } from '../../database/entities/user.entity';
import { DatabaseModule } from '../../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { RiskModule } from '../risk/risk.module';
import { BehaviorModule } from '../behavior/behavior.module';
import { NewsModule } from '../news/news.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User]), LlmModule, PortfolioModule, RiskModule, BehaviorModule, NewsModule, AgentModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
