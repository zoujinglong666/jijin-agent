import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskSnapshot as RiskSnapshotEntity } from '../../database/entities/risk-snapshot.entity';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';
import { NewsService } from '../news/news.service';
import type { RiskSnapshot, StressTestScenario, StressTestResult } from '../../common/types';
import { HIGH_VOLATILITY_SECTORS } from '../../common/types';
import { RISK_THRESHOLD_SAFE, RISK_THRESHOLD_WARNING } from '../../common/constants';

export interface RiskAlert {
  id: string;
  level: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  sector?: string;
}

@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(RiskSnapshotEntity)
    private riskSnapshotRepository: Repository<RiskSnapshotEntity>,
    private portfolioService: PortfolioService,
    private behaviorService: BehaviorService,
    private newsService: NewsService,
  ) {}

  async calculateRisk(userId: string): Promise<RiskSnapshot> {
    const concentration = await this.portfolioService.getMaxSectorConcentration(userId);
    const highVolRatio = await this.portfolioService.getHighVolatilityRatio(userId);
    const behaviorState = await this.behaviorService.getBehaviorState(userId);
    const userSectors = Object.keys(await this.portfolioService.getSectorRatios(userId));
    const recentEvents = await this.newsService.getLatestEvents(userSectors, 10);
    const eventImpact = this.newsService.calculateEventImpact(recentEvents, userSectors);

    const sectorConcentration = concentration.ratio * 100;
    const marketVolatility = highVolRatio * 100;
    const behaviorScore = behaviorState.score;

    const score = Math.min(100, Math.round(
      sectorConcentration * 0.4 +
      marketVolatility * 0.3 +
      behaviorScore * 0.2 +
      eventImpact * 0.1
    ));

    const level = this.getLevel(score);

    const snapshot: RiskSnapshot = {
      score,
      level,
      sectorConcentration,
      marketVolatility,
      behaviorScore,
      eventImpact,
      timestamp: Date.now(),
    };

    await this.saveSnapshot(userId, snapshot);

    return snapshot;
  }

  async saveSnapshot(userId: string, snapshot: RiskSnapshot): Promise<RiskSnapshotEntity> {
    const entity = this.riskSnapshotRepository.create({
      userId,
      score: snapshot.score,
      level: snapshot.level,
      sectorConcentration: snapshot.sectorConcentration,
      marketVolatility: snapshot.marketVolatility,
      behaviorScore: snapshot.behaviorScore,
      eventImpact: snapshot.eventImpact,
    });
    return this.riskSnapshotRepository.save(entity);
  }

  private getLevel(score: number): RiskSnapshot['level'] {
    if (score < RISK_THRESHOLD_SAFE) return 'safe';
    if (score < RISK_THRESHOLD_WARNING) return 'warning';
    return 'danger';
  }

  async runStressTest(userId: string, scenario: StressTestScenario): Promise<StressTestResult> {
    const funds = await this.portfolioService.getFunds(userId);
    const total = await this.portfolioService.getTotalAmount(userId);
    if (total === 0) return { scenario, portfolioDrop: 0, lossAmount: 0, sectorContributions: [] };

    const sectorRatios = await this.portfolioService.getSectorRatios(userId);
    let portfolioDrop = 0;
    const sectorContributions: { sector: string; contribution: number }[] = [];

    if (scenario.sector === '全部') {
      portfolioDrop = scenario.dropPercent;
      Object.entries(sectorRatios).forEach(([sector, data]) => {
        sectorContributions.push({ sector, contribution: data.ratio * scenario.dropPercent });
      });
    } else {
      const sectorRatio = sectorRatios[scenario.sector]?.ratio || 0;
      portfolioDrop = sectorRatio * scenario.dropPercent;
      sectorContributions.push({ sector: scenario.sector, contribution: portfolioDrop });
      Object.entries(sectorRatios).filter(([s]) => s !== scenario.sector).forEach(([sector, data]) => {
        const indirect = data.ratio * scenario.dropPercent * 0.3;
        if (indirect > 0.1) { sectorContributions.push({ sector, contribution: indirect }); portfolioDrop += indirect; }
      });
    }

    sectorContributions.sort((a, b) => b.contribution - a.contribution);
    return { scenario, portfolioDrop: Math.round(portfolioDrop * 100) / 100, lossAmount: Math.round(total * portfolioDrop / 100), sectorContributions };
  }

  async getAlerts(userId: string): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];
    const sectorRatios = await this.portfolioService.getSectorRatios(userId);
    const highVolRatio = await this.portfolioService.getHighVolatilityRatio(userId);
    const funds = await this.portfolioService.getFunds(userId);

    // 集中度告警
    Object.entries(sectorRatios).forEach(([sector, data]) => {
      if (data.ratio > 0.4) {
        alerts.push({ id: `concentration_${sector}`, level: 'high', title: `${sector}仓位偏高`, content: `你的${sector}相关基金占总资产${(data.ratio * 100).toFixed(0)}%。当前主题集中度较高，短期波动可能明显高于普通混合基金。`, sector });
      } else if (data.ratio > 0.25) {
        alerts.push({ id: `concentration_${sector}`, level: 'medium', title: `${sector}仓位偏高`, content: `你的${sector}相关基金占总资产${(data.ratio * 100).toFixed(0)}%，需关注集中度风险。`, sector });
      }
    });

    // 重复持仓告警
    const sectorCount: Record<string, number> = {};
    funds.forEach(f => { sectorCount[f.sector] = (sectorCount[f.sector] || 0) + 1; });
    Object.entries(sectorCount).forEach(([sector, count]) => {
      if (count >= 3) {
        alerts.push({ id: `duplicate_${sector}`, level: 'medium', title: `${sector}重复持仓较多`, content: `你持有${count}只${sector}主题基金，它们可能存在较高重叠。`, sector });
      }
    });

    // 高波动告警
    if (highVolRatio > 0.7) {
      alerts.push({ id: 'high_volatility', level: 'high', title: '高波动资产占比较高', content: `当前账户高波动资产占比${(highVolRatio * 100).toFixed(0)}%，波动风险偏高，请关注仓位承受能力。` });
    }
    if (highVolRatio > 0.9) {
      alerts.push({ id: 'extreme_volatility', level: 'high', title: '极度偏重高风险资产', content: '你的持仓几乎全部为高波动资产，现金和债券占比极低，请关注风险承受能力。' });
    }

    // 现金占比告警
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    const cashAmount = funds.filter(f => f.sector === '现金').reduce((sum, f) => sum + Number(f.amount), 0);
    if (total > 0 && cashAmount / total < 0.05 && funds.length > 0) {
      alerts.push({ id: 'low_cash', level: 'low', title: '现金占比较低', content: '当前现金占比不足5%，应对极端行情的缓冲空间较小。' });
    }

    alerts.sort((a, b) => {
      const levelOrder = { high: 0, medium: 1, low: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });

    return alerts.slice(0, 3);
  }

  getDefaultScenarios(): StressTestScenario[] {
    return [
      { id: 'semi_5', name: '半导体下跌5%', description: '半导体板块短期回调5%', sector: '半导体', dropPercent: 5, isCustom: false },
      { id: 'ne_8', name: '新能源下跌8%', description: '新能源板块回调8%', sector: '新能源', dropPercent: 8, isCustom: false },
      { id: 'market_10', name: '市场整体回撤', description: '沪深300回撤10%', sector: '全部', dropPercent: 10, isCustom: false },
      { id: 'tech_12', name: '科技股闪崩', description: '半导体-12%', sector: '半导体', dropPercent: 12, isCustom: false },
      { id: 'ai_15', name: 'AI退潮', description: 'AI主题-15%', sector: 'AI', dropPercent: 15, isCustom: false },
      { id: 'us_10', name: '美股暴跌', description: '纳指-10%', sector: '美股', dropPercent: 10, isCustom: false },
    ];
  }

  async getHistory(userId: string) {
    return this.riskSnapshotRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 30,
    });
  }
}
