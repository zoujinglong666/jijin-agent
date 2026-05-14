import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Fund, User } from '../../database/entities';

export interface FundQuote {
  fundCode: string;
  fundName: string;
  nav: number; // 单位净值
  accNav: number; // 累计净值
  dailyChange: number; // 日涨跌
  dailyChangePercent: number; // 日涨跌幅
  estimateNav: number; // 估值
  estimateChange: number; // 估值涨跌
  estimateChangePercent: number; // 估值涨跌幅
  lastUpdated: Date;
}

export interface MarketAlert {
  id: string;
  type: 'high_volatility' | 'sector_decline' | 'concentration_risk' | 'behavior_anomaly';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  fundCodes: string[];
  triggeredAt: Date;
  isRead: boolean;
}

export interface UserPortfolioSnapshot {
  userId: string;
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  sectorDistribution: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private fundQuotes: Map<string, FundQuote> = new Map();
  private marketAlerts: Map<string, MarketAlert[]> = new Map();

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 获取基金实时行情
   */
  async getFundQuote(fundCode: string): Promise<FundQuote | null> {
    // 先从缓存获取
    const cached = this.fundQuotes.get(fundCode);
    if (cached && Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) {
      return cached;
    }

    // 从API获取实时数据
    try {
      const quote = await this.fetchFundQuote(fundCode);
      if (quote) {
        this.fundQuotes.set(fundCode, quote);
      }
      return quote;
    } catch (error) {
      this.logger.error(`Failed to fetch quote for fund ${fundCode}:`, error);
      return null;
    }
  }

  /**
   * 获取多个基金的行情
   */
  async getMultipleFundQuotes(fundCodes: string[]): Promise<FundQuote[]> {
    const quotes: FundQuote[] = [];
    
    for (const code of fundCodes) {
      const quote = await this.getFundQuote(code);
      if (quote) {
        quotes.push(quote);
      }
    }
    
    return quotes;
  }

  /**
   * 从API获取基金实时行情
   */
  private async fetchFundQuote(fundCode: string): Promise<FundQuote | null> {
    try {
      // 使用天天基金网的API
      const response = await firstValueFrom(
        this.httpService.get('https://fundmobapi.eastmoney.com/FundMApi/FundBaseInformation.ashx', {
          params: {
            deviceid: 'default',
            version: '6.3.8',
            product: 'EFund',
            plat: 'Iphone',
            FCodes: fundCode,
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          },
        })
      );

      const data = response.data;
      if (data && data.Datas && data.Datas.length > 0) {
        const fundData = data.Datas[0];
        
        return {
          fundCode,
          fundName: fundData.SHORTNAME,
          nav: parseFloat(fundData.NAV) || 0,
          accNav: parseFloat(fundData.ACCNAV) || 0,
          dailyChange: parseFloat(fundData.NAVCHGRT) || 0,
          dailyChangePercent: parseFloat(fundData.NAVCHGRT) || 0,
          estimateNav: parseFloat(fundData.GSZ) || 0,
          estimateChange: parseFloat(fundData.GSZZL) || 0,
          estimateChangePercent: parseFloat(fundData.GSZZL) || 0,
          lastUpdated: new Date(),
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch fund quote for ${fundCode}:`, error);
      return null;
    }
  }

  /**
   * 获取市场警报
   */
  async getMarketAlerts(userId: string): Promise<MarketAlert[]> {
    return this.marketAlerts.get(userId) || [];
  }

  /**
   * 创建市场警报
   */
  async createMarketAlert(userId: string, alert: Omit<MarketAlert, 'id' | 'triggeredAt' | 'isRead'>): Promise<MarketAlert> {
    const newAlert: MarketAlert = {
      ...alert,
      id: Math.random().toString(36).substring(7),
      triggeredAt: new Date(),
      isRead: false,
    };
    
    const alerts = this.marketAlerts.get(userId) || [];
    alerts.push(newAlert);
    this.marketAlerts.set(userId, alerts);
    
    return newAlert;
  }

  /**
   * 标记警报为已读
   */
  async markAlertAsRead(userId: string, alertId: string): Promise<boolean> {
    const alerts = this.marketAlerts.get(userId) || [];
    const alert = alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.isRead = true;
      this.marketAlerts.set(userId, alerts);
      return true;
    }
    
    return false;
  }

  /**
   * 获取用户投资组合快照
   */
  async getUserPortfolioSnapshot(userId: string): Promise<UserPortfolioSnapshot | null> {
    try {
      // 获取用户基金
      const funds = await this.fundRepository.find({ where: { userId } });
      
      if (funds.length === 0) {
        return null;
      }
      
      // 计算总价值
      const totalValue = funds.reduce((sum, fund) => sum + (fund.currentValue || 0), 0);
      
      // 计算日变化
      const dailyChange = funds.reduce((sum, fund) => {
        const change = (fund.currentValue || 0) * (fund.profitRate || 0) / 100;
        return sum + change;
      }, 0);
      
      const dailyChangePercent = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;
      
      // 计算板块分布
      const sectorDistribution: Record<string, number> = {};
      funds.forEach(fund => {
        const sector = fund.sector || '其他';
        sectorDistribution[sector] = (sectorDistribution[sector] || 0) + (fund.currentValue || 0);
      });
      
      // 归一化板块分布
      Object.keys(sectorDistribution).forEach(sector => {
        sectorDistribution[sector] = (sectorDistribution[sector] / totalValue) * 100;
      });
      
      // 评估风险等级
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (dailyChangePercent > 2 || dailyChangePercent < -2) {
        riskLevel = 'high';
      } else if (dailyChangePercent > 1 || dailyChangePercent < -1) {
        riskLevel = 'medium';
      }
      
      return {
        userId,
        totalValue,
        dailyChange,
        dailyChangePercent,
        sectorDistribution,
        riskLevel,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get portfolio snapshot for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * 定期更新基金行情数据
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateFundQuotes() {
    try {
      this.logger.log('Updating fund quotes...');
      
      // 获取所有用户的基金代码
      const funds = await this.fundRepository.find();
      const fundCodes = [...new Set(funds.map(f => f.fundCode))];
      
      // 批量更新行情
      for (const code of fundCodes) {
        const quote = await this.fetchFundQuote(code);
        if (quote) {
          this.fundQuotes.set(code, quote);
        }
      }
      
      this.logger.log(`Updated quotes for ${fundCodes.length} funds`);
    } catch (error) {
      this.logger.error('Failed to update fund quotes:', error);
    }
  }
}