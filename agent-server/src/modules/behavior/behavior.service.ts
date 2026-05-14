import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { BehaviorLog } from '../../database/entities/behavior-log.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';
import { Fund } from '../../database/entities/fund.entity';
import type { BehaviorState, BehaviorEvent } from '../../common/types';
import { HIGH_VOLATILITY_SECTORS } from '../../common/types';
import {
  BEHAVIOR_WINDOW_HOURS,
  BEHAVIOR_THRESHOLD_CALM,
  BEHAVIOR_THRESHOLD_ALERT,
  BEHAVIOR_THRESHOLD_ANXIOUS,
} from '../../common/constants';

export interface InvestmentPersonality {
  type: string;
  label: string;
  description: string;
  traits: string[];
  score: number;
}

export interface BehaviorTag {
  id: string;
  label: string;
  description: string;
  triggered: boolean;
  triggerCondition: string;
}

export interface BehaviorStats {
  viewCount: number;
  reduceCount: number;
  addCount: number;
  recentActions: number;
  portfolioViewCount: number;
}

@Injectable()
export class BehaviorService {
  constructor(
    @InjectRepository(BehaviorLog)
    private behaviorLogRepository: Repository<BehaviorLog>,
    @InjectRepository(ActionRecord)
    private actionRecordRepository: Repository<ActionRecord>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
  ) {}

  async recordEvent(userId: string, event: BehaviorEvent): Promise<void> {
    const entity = this.behaviorLogRepository.create({
      userId,
      eventType: event as any,
      eventData: '',
    });
    await this.behaviorLogRepository.save(entity);
  }

  async getBehaviorState(userId: string): Promise<BehaviorState> {
    const windowMs = BEHAVIOR_WINDOW_HOURS * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs);
    const recentRecords = await this.behaviorLogRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff) },
      order: { createdAt: 'ASC' },
    });

    const openFrequency = recentRecords.filter(r => r.eventType === 'REFRESH').length;
    const refreshFrequency = recentRecords.filter(r => r.eventType === 'REFRESH').length;
    const portfolioViewCount = recentRecords.filter(r => r.eventType === 'PORTFOLIO_VIEW').length;
    const simulateActionCount = recentRecords.filter(r => r.eventType === 'SIMULATE_SELL').length;

    const score = Math.min(100, Math.round(
      openFrequency * 0.3 +
      portfolioViewCount * 0.3 +
      refreshFrequency * 0.2 +
      simulateActionCount * 0.2
    ));

    const level = this.getLevel(score);
    const lastEvent = recentRecords.length > 0 ? new Date(recentRecords[recentRecords.length - 1].createdAt).getTime() : 0;

    return { score, level, openFrequency, refreshFrequency, portfolioViewCount, simulateActionCount, lastEventTime: lastEvent };
  }

  private getLevel(score: number): BehaviorState['level'] {
    if (score < BEHAVIOR_THRESHOLD_CALM) return 'calm';
    if (score < BEHAVIOR_THRESHOLD_ALERT) return 'alert';
    if (score < BEHAVIOR_THRESHOLD_ANXIOUS) return 'anxious';
    return 'panic';
  }

  async getEventCount(userId: string, event: BehaviorEvent, hours: number): Promise<number> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.behaviorLogRepository.count({
      where: { userId, eventType: event as any, createdAt: MoreThanOrEqual(cutoff) },
    });
  }

  async isPanicBehavior(userId: string): Promise<boolean> {
    const state = await this.getBehaviorState(userId);
    return state.refreshFrequency > 5 && state.level === 'panic';
  }

  async isAnxietyBehavior(userId: string): Promise<boolean> {
    const state = await this.getBehaviorState(userId);
    return state.portfolioViewCount > 10;
  }

  async getPersonality(userId: string): Promise<InvestmentPersonality> {
    const funds = await this.fundRepository.find({ where: { userId } });
    const maxConcentration = await this.getMaxSectorConcentration(funds);
    const highVolRatio = this.calculateHighVolatilityRatio(funds);
    const score = await this.calculateEmotionRiskScore(userId, funds);
    const viewCount = await this.getEventCount(userId, 'PORTFOLIO_VIEW' as BehaviorEvent, 168);
    const recentActions = await this.getRecentActionCount(userId, 7);

    if (maxConcentration.ratio > 0.6) {
      return { type: 'theme_gambler', label: '主题赌徒型', description: '偏爱单赛道重仓，追求极致收益', traits: ['偏爱高成长主题', '容易长期重仓', '对短期波动较敏感', '倾向集中押注'], score };
    }
    if (viewCount > 20) {
      return { type: 'emotion_sensitive', label: '情绪敏感型', description: '高频查看账户，容易受波动影响', traits: ['频繁查看账户', '对波动反应强烈', '容易情绪化操作', '需要更多心理缓冲'], score };
    }
    if (highVolRatio > 0.7) {
      return { type: 'aggressive_growth', label: '激进成长型', description: '偏好高波动资产，追求成长收益', traits: ['偏好高波动资产', '风险承受能力较强', '关注成长主题', '需注意仓位控制'], score };
    }
    if (recentActions === 0 && funds.length > 0) {
      return { type: 'long_term_holder', label: '长期持有型', description: '操作频率低，倾向长期持有', traits: ['操作频率低', '长期持有为主', '情绪相对稳定', '适合定投策略'], score };
    }
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    const safeAmount = funds.filter(f => ['现金', '债券', '红利'].includes(f.sector)).reduce((sum, f) => sum + Number(f.amount), 0);
    if (total > 0 && safeAmount / total > 0.5) {
      return { type: 'diversified_safe', label: '分散安全型', description: '债券和现金占比较高，追求稳健', traits: ['偏好低风险资产', '债券和现金比例高', '波动承受能力低', '注重资产安全'], score };
    }
    return { type: 'balanced', label: '均衡配置型', description: '资产配置相对均衡，风险适中', traits: ['配置相对均衡', '风险适中', '操作频率正常', '情绪较为稳定'], score };
  }

  async getTags(userId: string): Promise<BehaviorTag[]> {
    const funds = await this.fundRepository.find({ where: { userId } });
    const highVolRatio = this.calculateHighVolatilityRatio(funds);
    const maxConcentration = await this.getMaxSectorConcentration(funds);
    const viewCount = await this.getEventCount(userId, 'PORTFOLIO_VIEW' as BehaviorEvent, 168);
    const recentActions = await this.actionRecordRepository.count({
      where: { userId, createTime: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });
    const recentAddPositions = await this.behaviorLogRepository.count({
      where: { userId, eventType: 'ADD_POSITION', createdAt: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });
    const recentReduceActions = await this.actionRecordRepository.count({
      where: { userId, actionType: 'adjust', createTime: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });

    return [
      { id: 'chase_rise', label: '容易追涨', description: '高涨幅后新增仓位', triggered: recentAddPositions > 3, triggerCondition: '近7天新增仓位超过3次' },
      { id: 'easy_panic', label: '容易恐慌', description: '大跌后频繁查看', triggered: viewCount > 15, triggerCondition: '近7天查看账户超过15次' },
      { id: 'long_overweight', label: '长期重仓', description: '高风险仓位持续30天', triggered: highVolRatio > 0.7, triggerCondition: '高波动资产占比超过70%' },
      { id: 'frequent_regret', label: '频繁后悔', description: '短期多次减仓', triggered: recentReduceActions >= 3, triggerCondition: '近7天减仓超过3次' },
      { id: 'gambling_tendency', label: '赌博倾向', description: '单主题超60%', triggered: maxConcentration.ratio > 0.6, triggerCondition: '单一主题仓位超过60%' },
    ];
  }

  async getStats(userId: string): Promise<BehaviorStats> {
    const viewCount = await this.getEventCount(userId, 'PORTFOLIO_VIEW' as BehaviorEvent, 168);
    const portfolioViewCount = await this.getEventCount(userId, 'PORTFOLIO_VIEW' as BehaviorEvent, 24);
    const recentReduceActions = await this.actionRecordRepository.count({
      where: { userId, actionType: 'adjust', createTime: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });
    const recentAddActions = await this.actionRecordRepository.count({
      where: { userId, actionType: 'add', createTime: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });
    const recentActions = await this.actionRecordRepository.count({
      where: { userId, createTime: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) },
    });

    return { viewCount, reduceCount: recentReduceActions, addCount: recentAddActions, recentActions, portfolioViewCount };
  }

  private calculateHighVolatilityRatio(funds: Fund[]): number {
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    if (total === 0) return 0;
    const highVolAmount = funds.filter(f => HIGH_VOLATILITY_SECTORS.includes(f.sector)).reduce((sum, f) => sum + Number(f.amount), 0);
    return highVolAmount / total;
  }

  private async getMaxSectorConcentration(funds: Fund[]): Promise<{ sector: string; ratio: number }> {
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    if (total === 0) return { sector: '', ratio: 0 };
    const sectorMap: Record<string, number> = {};
    funds.forEach(f => { sectorMap[f.sector] = (sectorMap[f.sector] || 0) + Number(f.amount); });
    let maxSector = '', maxRatio = 0;
    Object.entries(sectorMap).forEach(([sector, amount]) => {
      const ratio = amount / total;
      if (ratio > maxRatio) { maxSector = sector; maxRatio = ratio; }
    });
    return { sector: maxSector, ratio: maxRatio };
  }

  private async calculateEmotionRiskScore(userId: string, funds: Fund[]): Promise<number> {
    const maxConcentration = await this.getMaxSectorConcentration(funds);
    const highVolRatio = this.calculateHighVolatilityRatio(funds);
    const sectorCount: Record<string, number> = {};
    funds.forEach(f => { sectorCount[f.sector] = (sectorCount[f.sector] || 0) + 1; });
    const maxDuplicateCount = Math.max(...Object.values(sectorCount), 0);
    const viewCount = await this.getEventCount(userId, 'PORTFOLIO_VIEW' as BehaviorEvent, 24);

    const concentrationScore = Math.min(maxConcentration.ratio * 100, 100);
    const volatilityScore = highVolRatio * 100;
    const duplicateScore = Math.min(maxDuplicateCount * 20, 100);
    const viewScore = Math.min(viewCount * 5, 100);

    return Math.round(Math.min(concentrationScore * 0.35 + volatilityScore * 0.30 + duplicateScore * 0.20 + viewScore * 0.15, 100));
  }

  private async getRecentActionCount(userId: string, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.actionRecordRepository.count({ where: { userId, createTime: MoreThanOrEqual(cutoff) } });
  }

  async getLogs(userId: string): Promise<BehaviorLog[]> {
    return this.behaviorLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
