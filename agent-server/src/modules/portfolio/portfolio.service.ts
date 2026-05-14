import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fund as FundEntity } from '../../database/entities/fund.entity';
import { ActionRecord as ActionRecordEntity } from '../../database/entities/action-record.entity';
import { HIGH_VOLATILITY_SECTORS } from '../../common/types';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(FundEntity)
    private fundRepository: Repository<FundEntity>,
    @InjectRepository(ActionRecordEntity)
    private actionRecordRepository: Repository<ActionRecordEntity>,
  ) {}

  async getFunds(userId: string): Promise<FundEntity[]> {
    return this.fundRepository.find({ where: { userId } });
  }

  async addFund(userId: string, fund: Omit<FundEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<FundEntity> {
    const entity = this.fundRepository.create({ ...fund, userId });
    return this.fundRepository.save(entity);
  }

  async updateFund(userId: string, fundId: string, updates: Partial<FundEntity>): Promise<FundEntity | null> {
    const fund = await this.fundRepository.findOne({ where: { id: fundId, userId } });
    if (!fund) return null;
    Object.assign(fund, updates);
    return this.fundRepository.save(fund);
  }

  async deleteFund(userId: string, fundId: string): Promise<boolean> {
    const result = await this.fundRepository.delete({ id: fundId, userId });
    return (result.affected ?? 0) > 0;
  }

  async getTotalAmount(userId: string): Promise<number> {
    const result = await this.fundRepository
      .createQueryBuilder('f')
      .select('SUM(f.amount)', 'total')
      .where('f.userId = :userId', { userId })
      .getRawOne();
    return parseFloat(result?.total) || 0;
  }

  async getSectorRatios(userId: string): Promise<Record<string, { ratio: number; amount: number; fundCount: number }>> {
    const funds = await this.getFunds(userId);
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    if (total === 0) return {};

    const sectorMap: Record<string, { amount: number; fundCount: number }> = {};
    funds.forEach(f => {
      if (!sectorMap[f.sector]) sectorMap[f.sector] = { amount: 0, fundCount: 0 };
      sectorMap[f.sector].amount += Number(f.amount);
      sectorMap[f.sector].fundCount += 1;
    });

    const result: Record<string, { ratio: number; amount: number; fundCount: number }> = {};
    Object.entries(sectorMap).forEach(([sector, data]) => {
      result[sector] = { ratio: data.amount / total, amount: data.amount, fundCount: data.fundCount };
    });
    return result;
  }

  async getHighVolatilityRatio(userId: string): Promise<number> {
    const funds = await this.getFunds(userId);
    const total = funds.reduce((sum, f) => sum + Number(f.amount), 0);
    if (total === 0) return 0;
    const highVolAmount = funds.filter(f => HIGH_VOLATILITY_SECTORS.includes(f.sector)).reduce((sum, f) => sum + Number(f.amount), 0);
    return highVolAmount / total;
  }

  async getMaxSectorConcentration(userId: string): Promise<{ sector: string; ratio: number }> {
    const ratios = await this.getSectorRatios(userId);
    let maxSector = '';
    let maxRatio = 0;
    Object.entries(ratios).forEach(([sector, data]) => {
      if (data.ratio > maxRatio) { maxSector = sector; maxRatio = data.ratio; }
    });
    return { sector: maxSector, ratio: maxRatio };
  }

  async addAction(userId: string, action: { fundId: string; actionType: 'add' | 'remove' | 'adjust' | 'rebalance' | 'sell_all' | 'buy_all'; ratio: number; reason: string }): Promise<ActionRecordEntity> {
    const entity = this.actionRecordRepository.create({ ...action, userId });
    return this.actionRecordRepository.save(entity);
  }

  async getActions(userId: string, fundId?: string): Promise<ActionRecordEntity[]> {
    const where: any = { userId };
    if (fundId) where.fundId = fundId;
    return this.actionRecordRepository.find({ where, order: { createTime: 'DESC' } });
  }

  async importFunds(userId: string, funds: Omit<FundEntity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<FundEntity[]> {
    const entities = funds.map(f => this.fundRepository.create({ ...f, userId }));
    return this.fundRepository.save(entities);
  }
}
