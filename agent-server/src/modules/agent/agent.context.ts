import { Injectable } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';
import { RiskService } from '../risk/risk.service';
import { NewsService } from '../news/news.service';
import type { AgentContext as IAgentContext, EmotionState } from '../../common/types';

@Injectable()
export class AgentContextBuilder {
  constructor(
    private portfolioService: PortfolioService,
    private behaviorService: BehaviorService,
    private riskService: RiskService,
    private newsService: NewsService,
  ) {}

  async build(userId: string): Promise<IAgentContext> {
    const portfolio = await this.portfolioService.getFunds(userId);
    const behavior = await this.behaviorService.getBehaviorState(userId);
    const risk = await this.riskService.calculateRisk(userId);
    const userSectors = Object.keys(await this.portfolioService.getSectorRatios(userId));
    const marketEvents = await this.newsService.getLatestEvents(userSectors, 5);
    const emotion = this.calculateEmotion(behavior, risk);

    return { userId, portfolio: portfolio as any, behavior, emotion, marketEvents: marketEvents as any, risk };
  }

  private calculateEmotion(behavior: any, risk: any): EmotionState {
    const score = Math.min(100, Math.round(behavior.score * 0.6 + risk.score * 0.4));
    const level = score < 30 ? 'stable' : score < 60 ? 'neutral' : score < 80 ? 'anxious' : 'panic';
    const trend = behavior.score > 60 ? 'worsening' : behavior.score < 30 ? 'improving' : 'stable';
    return { score, level, trend };
  }
}
