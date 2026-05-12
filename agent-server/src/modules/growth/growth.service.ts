import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GrowthMetricsEntity } from '../../database/entities/growth-metrics.entity';

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(GrowthMetricsEntity)
    private growthRepository: Repository<GrowthMetricsEntity>,
  ) {}

  async getMetrics(userId: string): Promise<GrowthMetricsEntity> {
    let metrics = await this.growthRepository.findOne({ where: { userId } });
    if (!metrics) {
      metrics = this.growthRepository.create({ userId, stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 });
      metrics = await this.growthRepository.save(metrics);
    }
    return metrics;
  }

  async updateMetrics(userId: string, updates: Partial<Pick<GrowthMetricsEntity, 'stableDays' | 'riskControlRate' | 'emotionStability' | 'longTermHoldIndex'>>): Promise<GrowthMetricsEntity> {
    let metrics = await this.growthRepository.findOne({ where: { userId } });
    if (!metrics) {
      metrics = this.growthRepository.create({ userId, stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 });
      metrics = await this.growthRepository.save(metrics);
    }
    Object.assign(metrics, updates);
    return this.growthRepository.save(metrics);
  }
}