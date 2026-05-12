import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentLoop } from './agent.loop';
import { AgentContextBuilder } from './agent.context';
import { AgentPrompt } from './agent.prompt';
import { AgentDecision } from './agent.decision';
import { AgentMemory } from './agent.memory';
import { LlmModule } from '../llm/llm.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { BehaviorModule } from '../behavior/behavior.module';
import { RiskModule } from '../risk/risk.module';
import { NewsModule } from '../news/news.module';
import { DatabaseModule } from '../../database/database.module';
import { RiskSnapshot } from '../../database/entities/risk-snapshot.entity';
import { EmotionHistory } from '../../database/entities/emotion-history.entity';
import { AgentOutputRecord } from '../../database/entities/agent-output.entity';
import { Fund } from '../../database/entities/fund.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([RiskSnapshot, EmotionHistory, AgentOutputRecord, Fund, User]),
    LlmModule,
    PortfolioModule,
    BehaviorModule,
    RiskModule,
    NewsModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentLoop, AgentContextBuilder, AgentPrompt, AgentDecision, AgentMemory],
  exports: [AgentService],
})
export class AgentModule {}
