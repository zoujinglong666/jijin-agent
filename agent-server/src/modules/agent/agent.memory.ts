import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { RiskSnapshot } from '../../database/entities/risk-snapshot.entity';
import { EmotionHistory } from '../../database/entities/emotion-history.entity';
import { AgentOutputRecord } from '../../database/entities/agent-output.entity';
import { Fund } from '../../database/entities/fund.entity';
import type { RiskSnapshot as IRiskSnapshot, EmotionState, AgentOutput } from '../../common/types';

@Injectable()
export class AgentMemory {
  constructor(
    @InjectRepository(RiskSnapshot)
    private riskSnapshotRepository: Repository<RiskSnapshot>,
    @InjectRepository(EmotionHistory)
    private emotionHistoryRepository: Repository<EmotionHistory>,
    @InjectRepository(AgentOutputRecord)
    private agentOutputRepository: Repository<AgentOutputRecord>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
  ) {}

  async saveRiskSnapshot(userId: string, snapshot: IRiskSnapshot): Promise<RiskSnapshot> {
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

  async saveEmotionState(userId: string, state: EmotionState): Promise<EmotionHistory> {
    const entity = this.emotionHistoryRepository.create({
      userId,
      score: state.score,
      level: state.level,
      trend: state.trend,
    });
    return this.emotionHistoryRepository.save(entity);
  }

  async saveAgentOutput(userId: string, output: AgentOutput): Promise<AgentOutputRecord> {
    const entity = this.agentOutputRepository.create({
      userId,
      insight: output.insight,
      riskExplanation: output.riskExplanation,
      behaviorInsight: output.behaviorInsight,
      emotionInsight: output.emotionInsight,
      shouldNotify: output.shouldNotify,
      importance: output.importance,
    });
    return this.agentOutputRepository.save(entity);
  }

  async savePortfolioSnapshot(userId: string, _funds: any[]): Promise<void> {
    // Fund 表本身作为快照，无需额外保存
  }

  async getBehaviorTrend(userId: string, days: number = 7): Promise<{ date: string; score: number }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.emotionHistoryRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff) },
      order: { createdAt: 'ASC' },
    });
    return records.map(r => ({
      date: new Date(r.createdAt).toISOString().split('T')[0],
      score: r.score,
    }));
  }

  async getRiskTrend(userId: string, days: number = 7): Promise<{ date: string; score: number }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.riskSnapshotRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff) },
      order: { createdAt: 'ASC' },
    });
    return records.map(r => ({
      date: new Date(r.createdAt).toISOString().split('T')[0],
      score: r.score,
    }));
  }

  async getEmotionTrend(userId: string, days: number = 7): Promise<{ date: string; score: number; level: string }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records = await this.emotionHistoryRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff) },
      order: { createdAt: 'ASC' },
    });
    return records.map(r => ({
      date: new Date(r.createdAt).toISOString().split('T')[0],
      score: r.score,
      level: r.level,
    }));
  }

  async getRecent(userId: string, type?: string, limit: number = 30): Promise<any[]> {
    const results: any[] = [];

    if (!type || type === 'risk') {
      const risks = await this.riskSnapshotRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: type ? limit : 10,
      });
      results.push(...risks.map(r => ({ type: 'risk', data: r, timestamp: new Date(r.createdAt).getTime() })));
    }

    if (!type || type === 'emotion') {
      const emotions = await this.emotionHistoryRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: type ? limit : 10,
      });
      results.push(...emotions.map(r => ({ type: 'emotion', data: r, timestamp: new Date(r.createdAt).getTime() })));
    }

    if (!type || type === 'agent_output') {
      const outputs = await this.agentOutputRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: type ? limit : 10,
      });
      results.push(...outputs.map(r => ({ type: 'agent_output', data: r, timestamp: new Date(r.createdAt).getTime() })));
    }

    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async getPortfolioHistory(userId: string, limit: number = 10): Promise<Fund[]> {
    return this.fundRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async getRiskHistory(userId: string, limit: number = 30): Promise<RiskSnapshot[]> {
    return this.riskSnapshotRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
