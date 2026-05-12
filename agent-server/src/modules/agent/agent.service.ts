import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { AgentContextBuilder } from './agent.context';
import { AgentPrompt } from './agent.prompt';
import { AgentDecision } from './agent.decision';
import { AgentMemory } from './agent.memory';
import { LlmService } from '../llm/llm.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';
import { RiskService } from '../risk/risk.service';
import { NewsService } from '../news/news.service';
import type { AgentOutput } from '../../common/types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private agentContext: AgentContextBuilder,
    private agentPrompt: AgentPrompt,
    private agentDecision: AgentDecision,
    private agentMemory: AgentMemory,
    private llmService: LlmService,
    private portfolioService: PortfolioService,
    private behaviorService: BehaviorService,
    private riskService: RiskService,
    private newsService: NewsService,
  ) {}

  async getActiveUserIds(): Promise<string[]> {
    const users = await this.userRepository.find({
      where: { isActive: true, behaviorTrackingEnabled: true },
      select: ['id'],
    });
    return users.map(u => u.id);
  }

  async runForUser(userId: string): Promise<AgentOutput | null> {
    try {
      const context = await this.agentContext.build(userId);

      await Promise.all([
        this.agentMemory.saveRiskSnapshot(userId, context.risk),
        this.agentMemory.saveEmotionState(userId, context.emotion),
        this.agentMemory.savePortfolioSnapshot(userId, context.portfolio as any[]),
      ]);

      const messages = this.agentPrompt.buildMessages(context);
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const modelId = user?.llmModel || undefined;
      const llmResponse = await this.llmService.chat(messages, modelId);

      let rawOutput: AgentOutput;
      try {
        rawOutput = JSON.parse(llmResponse.content);
      } catch {
        rawOutput = {
          insight: '当前风险状态正常',
          riskExplanation: '持仓结构相对均衡。',
          behaviorInsight: '操作频率正常。',
          emotionInsight: '情绪状态稳定。',
          shouldNotify: false,
          importance: 0.3,
        };
      }

      const output = this.agentDecision.applyRules(
        userId,
        rawOutput,
        context.risk.score,
        context.behavior.level,
      );
      await this.agentMemory.saveAgentOutput(userId, output);

      return output;
    } catch (error) {
      this.logger.error(`Agent run failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      return null;
    }
  }

  async runForAllUsers(): Promise<void> {
    const userIds = await this.getActiveUserIds();
    this.logger.log(`Running agent for ${userIds.length} active users`);
    for (const userId of userIds) {
      await this.runForUser(userId);
    }
  }

  async triggerByBehavior(userId: string, event: string): Promise<AgentOutput | null> {
    await this.behaviorService.recordEvent(userId, event as any);
    const risk = await this.riskService.calculateRisk(userId);
    const behavior = await this.behaviorService.getBehaviorState(userId);
    if (risk.score > 80 || behavior.level === 'panic') {
      return this.runForUser(userId);
    }
    return null;
  }

  async triggerByMarket(event: any): Promise<void> {
    await this.newsService.addEvent(event);
    const userIds = await this.getActiveUserIds();
    for (const userId of userIds) {
      const userSectors = Object.keys(await this.portfolioService.getSectorRatios(userId));
      if (event.relatedSectors?.some((s: string) => userSectors.includes(s))) {
        await this.runForUser(userId);
      }
    }
  }

  async getMemoryTrends(userId: string) {
    const [behaviorTrend, riskTrend, emotionTrend, recentMemories] = await Promise.all([
      this.agentMemory.getBehaviorTrend(userId),
      this.agentMemory.getRiskTrend(userId),
      this.agentMemory.getEmotionTrend(userId),
      this.agentMemory.getRecent(userId, undefined, 10),
    ]);
    return { behaviorTrend, riskTrend, emotionTrend, recentMemories };
  }

  async getFullContext(userId: string) {
    return this.agentContext.build(userId);
  }
}
