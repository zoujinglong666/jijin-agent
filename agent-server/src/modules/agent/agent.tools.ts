import { Injectable, Logger } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RiskService } from '../risk/risk.service';
import { BehaviorService } from '../behavior/behavior.service';
import { NewsService } from '../news/news.service';
import type { Response } from 'express';

export interface ToolCallResult {
  name: string;
  result: any;
  status: 'success' | 'error';
  error?: string;
}

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);

  constructor(
    private portfolioService: PortfolioService,
    private riskService: RiskService,
    private behaviorService: BehaviorService,
    private newsService: NewsService,
  ) {}

  async executeTool(userId: string, toolName: string, args: any, res?: Response): Promise<ToolCallResult> {
    try {
      this.logger.log(`Executing tool ${toolName} for user ${userId}`);

      if (res) {
        res.write(`data: ${JSON.stringify({ tool_call_start: { name: toolName, args } })}\\n\\n`);
      }

      let result: any;

      switch (toolName) {
        case 'analyze_portfolio':
          result = await this.analyzePortfolio(userId);
          break;
        case 'check_risk':
          result = await this.checkRisk(userId);
          break;
        case 'analyze_behavior':
          result = await this.analyzeBehavior(userId);
          break;
        case 'get_market_news':
          result = await this.getMarketNews(userId);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      if (res) {
        res.write(`data: ${JSON.stringify({ tool_call_end: { name: toolName, result } })}\\n\\n`);
      }

      return {
        name: toolName,
        result,
        status: 'success',
      };
    } catch (error) {
      this.logger.error(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`);

      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';

      if (res) {
        res.write(`data: ${JSON.stringify({ tool_call_error: { name: toolName, error: errorMessage } })}\\n\\n`);
      }

      return {
        name: toolName,
        result: null,
        status: 'error',
        error: errorMessage,
      };
    }
  }

  private async analyzePortfolio(userId: string) {
    const [funds, total, sectorRatios, highVolRatio, maxConcentration] = await Promise.all([
      this.portfolioService.getFunds(userId),
      this.portfolioService.getTotalAmount(userId),
      this.portfolioService.getSectorRatios(userId),
      this.portfolioService.getHighVolatilityRatio(userId),
      this.portfolioService.getMaxSectorConcentration(userId),
    ]);

    return {
      fundCount: funds.length,
      totalAmount: total,
      highVolRatio,
      maxConcentration,
      sectorRatios,
      topFunds: funds.slice(0, 5).map((f: any) => ({
        name: f.name,
        code: f.code,
        amount: f.amount,
        profitRate: f.profitRate,
        sector: f.sector,
      })),
    };
  }

  private async checkRisk(userId: string) {
    const [risk, alerts] = await Promise.all([
      this.riskService.calculateRisk(userId),
      this.riskService.getAlerts(userId),
    ]);

    return {
      riskScore: risk.score,
      riskLevel: risk.level,
      alerts: alerts.map((a: any) => ({
        title: a.title,
        description: a.description || '',
        level: a.level,
      })),
      recommendations: (risk as any).recommendations || [],
    };
  }

  private async analyzeBehavior(userId: string) {
    const [behaviorState, personality] = await Promise.all([
      this.behaviorService.getBehaviorState(userId),
      this.behaviorService.getPersonality(userId),
    ]);

    return {
      behaviorLevel: behaviorState.level,
      behaviorScore: behaviorState.score,
      viewCount24h: behaviorState.portfolioViewCount,
      personality: personality.label,
      personalityDescription: personality.description,
      suggestions: (behaviorState as any).suggestions || [],
    };
  }

  private async getMarketNews(userId: string) {
    const userSectors = Object.keys(await this.portfolioService.getSectorRatios(userId));
    const news = await this.newsService.getLatestEvents(userSectors, 5);

    return {
      relevantNews: news.map((n: any) => ({
        title: n.title,
        content: n.content,
        source: n.source,
        impactLevel: n.impactLevel,
        relatedSectors: n.relatedSectors,
        timestamp: n.createdAt,
      })),
      userSectors,
    };
  }
}
