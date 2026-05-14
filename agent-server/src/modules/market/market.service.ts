import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';

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
    @InjectRepository('Fund')
    private fundRepository: Repository<any>,
    @InjectRepository('User')
    private userRepository: Repository<any>,
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
      this.logger.error(`Failed to fetch quote for ${fundCode}:`, error);
      return cached || null;
    }
  }

  /**
   * 批量获取基金行情
   */
  async getFundQuotes(fundCodes: string[]): Promise<FundQuote[]> {
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
   * 从天天基金API获取基金行情
   */
  private async fetchFundQuote(fundCode: string): Promise<FundQuote | null> {
    try {
      // 尝试多个数据源
      let quote = await this.fetchFromTiantian(fundCode);
      if (!quote) {
        quote = await this.fetchFromEastmoney(fundCode);
      }
      return quote;
    } catch (error) {
      this.logger.error(`Failed to fetch quote from all sources for ${fundCode}:`, error);
      return null;
    }
  }

  /**
   * 从天天基金获取数据
   */
  private async fetchFromTiantian(fundCode: string): Promise<FundQuote | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://fundgz.1234567.com.cn/js/' + fundCode + '.js', {
          params: {
            rt: Date.now(),
          },
          headers: {
            'Referer': 'https://fund.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      );

      // 解析返回的JSONP格式数据
      const dataStr = response.data;
      if (dataStr && dataStr.startsWith('jsonpgz(')) {
        const jsonStr = dataStr.substring(8, dataStr.length - 2);
        const data = JSON.parse(jsonStr);
        
        return {
          fundCode: data.fundcode,
          fundName: data.name,
          nav: parseFloat(data.dwjz) || 0,
          accNav: parseFloat(data.jzrq) || 0,
          dailyChange: parseFloat(data.jzzzl) || 0,
          dailyChangePercent: parseFloat(data.jzzzl) || 0,
          estimateNav: parseFloat(data.gsz) || 0,
          estimateChange: parseFloat(data.gszzl) || 0,
          estimateChangePercent: parseFloat(data.gszzl) || 0,
          lastUpdated: new Date(),
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch from Tiantian for ${fundCode}:`, error);
      return null;
    }
  }

  /**
   * 从东方财富获取数据
   */
  private async fetchFromEastmoney(fundCode: string): Promise<FundQuote | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://fund.eastmoney.com/pingzhongdata/' + fundCode + '.js', {
          headers: {
            'Referer': 'https://fund.eastmoney.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      );

      // 解析JavaScript中的数据
      const dataStr = response.data;
      if (dataStr) {
        // 提取净值数据
        const navMatch = dataStr.match(/Data_netWorthTrend\s*=\s*(\[[^\]]+\])/);
        const accNavMatch = dataStr.match(/Data_ACWorthTrend\s*=\s*(\[[^\]]+\])/);
        
        if (navMatch && navMatch[1]) {
          const navData = JSON.parse(navMatch[1]);
          const latestNav = navData[navData.length - 1];
          
          return {
            fundCode,
            fundName: '', // 需要从其他接口获取
            nav: latestNav.y || 0,
            accNav: latestNav.y || 0,
            dailyChange: 0, // 需要计算
            dailyChangePercent: 0,
            estimateNav: latestNav.y || 0,
            estimateChange: 0,
            estimateChangePercent: 0,
            lastUpdated: new Date(),
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch from Eastmoney for ${fundCode}:`, error);
      return null;
    }
  }

  /**
   * 创建市场异动提醒
   */
  async createMarketAlert(
    userId: string,
    type: MarketAlert['type'],
    level: MarketAlert['level'],
    title: string,
    message: string,
    fundCodes: string[]
  ): Promise<MarketAlert> {
    const alert: MarketAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      title,
      message,
      fundCodes,
      triggeredAt: new Date(),
      isRead: false,
    };

    // 保存到用户提醒列表
    const userAlerts = this.marketAlerts.get(userId) || [];
    userAlerts.push(alert);
    this.marketAlerts.set(userId, userAlerts);

    return alert;
  }

  /**
   * 获取用户市场提醒
   */
  async getUserAlerts(userId: string, limit: number = 50): Promise<MarketAlert[]> {
    const alerts = this.marketAlerts.get(userId) || [];
    return alerts
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * 标记提醒为已读
   */
  async markAlertAsRead(userId: string, alertId: string): Promise<boolean> {
    const alerts = this.marketAlerts.get(userId) || [];
    const alert = alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.isRead = true;
      return true;
    }
    
    return false;
  }

  /**
   * 检查用户持仓的市场异动
   */
  async checkPortfolioAlerts(userId: string): Promise<MarketAlert[]> {
    const alerts: MarketAlert[] = [];
    
    try {
      // 获取用户基金持仓
      const funds = await this.fundRepository.find({ where: { userId } });
      if (funds.length === 0) return alerts;

      const fundCodes = funds.map(f => f.code);
      const quotes = await this.getFundQuotes(fundCodes);

      // 检查单只基金大幅波动
      for (const quote of quotes) {
        if (Math.abs(quote.dailyChangePercent) > 5) {
          alerts.push({
            id: `volatility_${quote.fundCode}_${Date.now()}`,
            type: 'high_volatility',
            level: Math.abs(quote.dailyChangePercent) > 8 ? 'danger' : 'warning',
            title: `${quote.fundName} 大幅波动`,
            message: `${quote.fundName} 今日${quote.dailyChangePercent > 0 ? '上涨' : '下跌'}${Math.abs(quote.dailyChangePercent).toFixed(2)}%，请注意风险。`,
            fundCodes: [quote.fundCode],
            triggeredAt: new Date(),
            isRead: false,
          });
        }
      }

      // 检查板块整体下跌
      const sectorDistribution = await this.calculateSectorDistribution(userId);
      for (const [sector, change] of Object.entries(sectorDistribution)) {
        if (change < -3) {
          alerts.push({
            id: `sector_${sector}_${Date.now()}`,
            type: 'sector_decline',
            level: change < -5 ? 'danger' : 'warning',
            title: `${sector} 板块下跌`,
            message: `您的${sector}相关基金今日整体下跌${Math.abs(change).toFixed(2)}%，建议关注。`,
            fundCodes: funds.filter(f => f.sector === sector).map(f => f.code),
            triggeredAt: new Date(),
            isRead: false,
          });
        }
      }

      // 保存提醒
      const existingAlerts = this.marketAlerts.get(userId) || [];
      this.marketAlerts.set(userId, [...alerts, ...existingAlerts]);

    } catch (error) {
      this.logger.error(`Failed to check portfolio alerts for user ${userId}:`, error);
    }

    return alerts;
  }

  /**
   * 计算用户持仓的板块分布和涨跌幅
   */
  private async calculateSectorDistribution(userId: string): Promise<Record<string, number>> {
    const funds = await this.fundRepository.find({ where: { userId } });
    const quotes = await this.getFundQuotes(funds.map(f => f.code));
    
    const sectorChanges: Record<string, { totalValue: number; weightedChange: number }> = {};

    for (const fund of funds) {
      const quote = quotes.find(q => q.fundCode === fund.code);
      if (quote) {
        const value = fund.amount * quote.nav;
        if (!sectorChanges[fund.sector]) {
          sectorChanges[fund.sector] = { totalValue: 0, weightedChange: 0 };
        }
        
        sectorChanges[fund.sector].totalValue += value;
        sectorChanges[fund.sector].weightedChange += value * quote.dailyChangePercent;
      }
    }

    const result: Record<string, number> = {};
    for (const [sector, data] of Object.entries(sectorChanges)) {
      if (data.totalValue > 0) {
        result[sector] = data.weightedChange / data.totalValue;
      }
    }

    return result;
  }

  /**
   * 生成用户投资组合快照
   */
  async generatePortfolioSnapshot(userId: string): Promise<UserPortfolioSnapshot> {
    const funds = await this.fundRepository.find({ where: { userId } });
    const quotes = await this.getFundQuotes(funds.map(f => f.code));
    
    let totalValue = 0;
    let totalChange = 0;
    const sectorDistribution: Record<string, number> = {};

    for (const fund of funds) {
      const quote = quotes.find(q => q.fundCode === fund.code);
      if (quote) {
        const value = fund.amount * quote.nav;
        const change = value * (quote.dailyChangePercent / 100);
        
        totalValue += value;
        totalChange += change;
        
        if (!sectorDistribution[fund.sector]) {
          sectorDistribution[fund.sector] = 0;
        }
        sectorDistribution[fund.sector] += value;
      }
    }

    const dailyChangePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
    
    // 计算风险等级
    let riskLevel: UserPortfolioSnapshot['riskLevel'] = 'low';
    if (Math.abs(dailyChangePercent) > 5) {
      riskLevel = 'high';
    } else if (Math.abs(dailyChangePercent) > 2) {
      riskLevel = 'medium';
    }

    return {
      userId,
      totalValue,
      dailyChange: totalChange,
      dailyChangePercent,
      sectorDistribution,
      riskLevel,
      lastUpdated: new Date(),
    };
  }

  /**
   * 定期任务：更新基金行情数据
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async updateFundQuotes() {
    try {
      this.logger.log('Updating fund quotes...');
      
      // 获取所有需要更新的基金代码
      const uniqueCodes = new Set<string>();
      for (const [code] of this.fundQuotes) {
        uniqueCodes.add(code);
      }
      
      if (uniqueCodes.size > 0) {
        await this.getFundQuotes(Array.from(uniqueCodes));
        this.logger.log(`Updated quotes for ${uniqueCodes.size} funds`);
      }
    } catch (error) {
      this.logger.error('Failed to update fund quotes:', error);
    }
  }

  /**
   * 定期任务：检查市场异动
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkMarketAlerts() {
    try {
      this.logger.log('Checking market alerts...');
      
      // 这里可以实现更复杂的逻辑，如检查所有活跃用户
      // 暂时跳过具体实现
    } catch (error) {
      this.logger.error('Failed to check market alerts:', error);
    }
  }
}