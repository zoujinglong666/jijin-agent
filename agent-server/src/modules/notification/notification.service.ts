import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { BehaviorLog } from '../../database/entities/behavior-log.entity';
import { Fund } from '../../database/entities/fund.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketService, MarketAlert } from '../market/market.service';

export interface BehaviorIntervention {
  id: string;
  type: 'panic_detection' | 'frequent_checking' | 'concentration_risk' | 'chase_rise' | 'frequent_trading';
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  actionSuggestion: string;
  triggeredAt: Date;
  isRead: boolean;
  isDismissed: boolean;
}

export interface Notification {
  type: string;
  title: string;
  content: string;
  level: string;
  userId: string;
}

export interface MonthlyReport {
  userId: string;
  month: string;
  totalActions: number;
  panicEvents: number;
  concentrationChanges: number;
  sectorDistribution: Record<string, number>;
  riskTrend: Array<{ date: string; score: number }>;
  behaviorInsights: string[];
  recommendations: string[];
  generatedAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private behaviorInterventions: Map<string, BehaviorIntervention[]> = new Map();
  private monthlyReports: Map<string, MonthlyReport> = new Map();

  constructor(
    @InjectRepository(BehaviorLog)
    private behaviorLogRepository: Repository<BehaviorLog>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(ActionRecord)
    private actionRecordRepository: Repository<ActionRecord>,
    private marketService: MarketService,
  ) {}

  // 添加WebSocket服务器引用
  private webSocketServer: any = null;

  setWebSocketServer(server: any) {
    this.webSocketServer = server;
  }

  /**
   * 创建并推送通知
   */
  async create(userId: string, notification: Omit<Notification, 'userId'>): Promise<void> {
    this.logger.log(`Creating notification for user ${userId}: ${notification.title}`);
    
    // 这里可以保存到数据库或发送到WebSocket
    if (this.webSocketServer) {
      this.webSocketServer.emit(`notification_${userId}`, {
        ...notification,
        userId,
        timestamp: new Date(),
      });
    }
  }



  /**
   * 检测非理性行为并创建干预提醒
   */
  async detectIrrationalBehavior(userId: string): Promise<BehaviorIntervention[]> {
    const interventions: BehaviorIntervention[] = [];

    try {
      // 检测恐慌行为
      const panicIntervention = await this.detectPanicBehavior(userId);
      if (panicIntervention) {
        interventions.push(panicIntervention);
      }

      // 检测频繁查看账户
      const checkingIntervention = await this.detectFrequentChecking(userId);
      if (checkingIntervention) {
        interventions.push(checkingIntervention);
      }

      // 检测追涨行为
      const chaseIntervention = await this.detectChaseRiseBehavior(userId);
      if (chaseIntervention) {
        interventions.push(chaseIntervention);
      }

      // 检测频繁交易
      const tradingIntervention = await this.detectFrequentTrading(userId);
      if (tradingIntervention) {
        interventions.push(tradingIntervention);
      }

      // 检测集中度风险
      const concentrationIntervention = await this.detectConcentrationRisk(userId);
      if (concentrationIntervention) {
        interventions.push(concentrationIntervention);
      }

      // 保存干预提醒
      if (interventions.length > 0) {
        const existingInterventions = this.behaviorInterventions.get(userId) || [];
        this.behaviorInterventions.set(userId, [...interventions, ...existingInterventions]);
      }

    } catch (error) {
      this.logger.error(`Failed to detect irrational behavior for user ${userId}:`, error);
    }

    return interventions;
  }

  /**
   * 检测恐慌行为
   */
  private async detectPanicBehavior(userId: string): Promise<BehaviorIntervention | null> {
    const windowMs = 24 * 60 * 60 * 1000; // 24小时
    const cutoff = new Date(Date.now() - windowMs);
    
    const recentRecords = await this.behaviorLogRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff), eventType: 'REFRESH' },
      order: { createdAt: 'ASC' },
    });

    // 如果在短时间内大量刷新，可能是恐慌行为
    if (recentRecords.length > 10) {
      const timeWindows = this.calculateTimeWindows(recentRecords, 30 * 60 * 1000); // 30分钟窗口
      
      for (const window of timeWindows) {
        if (window.count > 5) {
          return {
            id: `panic_${Date.now()}`,
            type: 'panic_detection',
            level: 'danger',
            title: '🚨 检测到可能的恐慌行为',
            message: `您在${Math.round(window.duration / 60000)}分钟内刷新了${window.count}次，这可能表明您对市场波动感到焦虑。`,
            actionSuggestion: '建议：深呼吸，暂时离开交易界面，给自己一些冷静时间。',
            triggeredAt: new Date(),
            isRead: false,
            isDismissed: false,
          };
        }
      }
    }

    return null;
  }

  /**
   * 检测频繁查看账户
   */
  private async detectFrequentChecking(userId: string): Promise<BehaviorIntervention | null> {
    const windowMs = 7 * 24 * 60 * 60 * 1000; // 7天
    const cutoff = new Date(Date.now() - windowMs);
    
    const viewRecords = await this.behaviorLogRepository.count({
      where: { userId, createdAt: MoreThanOrEqual(cutoff), eventType: 'PORTFOLIO_VIEW' },
    });

    if (viewRecords > 50) {
      return {
        id: `checking_${Date.now()}`,
        type: 'frequent_checking',
        level: 'warning',
        title: '👀 频繁查看账户',
        message: `您在过去7天内查看了${viewRecords}次账户，平均每天要查看7次以上。`,
        actionSuggestion: '建议：设定固定的查看时间（如每天收盘后），避免频繁查看影响情绪。',
        triggeredAt: new Date(),
        isRead: false,
        isDismissed: false,
      };
    }

    return null;
  }

  /**
   * 检测追涨行为
   */
  private async detectChaseRiseBehavior(userId: string): Promise<BehaviorIntervention | null> {
    const windowMs = 30 * 24 * 60 * 60 * 1000; // 30天
    const cutoff = new Date(Date.now() - windowMs);
    
    const addRecords = await this.behaviorLogRepository.find({
      where: { userId, createdAt: MoreThanOrEqual(cutoff), eventType: 'ADD_POSITION' },
      order: { createdAt: 'DESC' },
    });

    if (addRecords.length > 5) {
      // 检查是否在短时间内多次加仓
      const recentAdds = addRecords.slice(0, 5);
      const firstAdd = recentAdds[recentAdds.length - 1];
      const lastAdd = recentAdds[0];
      
      if (lastAdd.createdAt.getTime() - firstAdd.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return {
          id: `chase_${Date.now()}`,
          type: 'chase_rise',
          level: 'warning',
          title: '📈 检测到追涨行为',
          message: `您在短时间内多次加仓，可能存在追涨杀跌的倾向。`,
          actionSuggestion: '建议：制定投资计划并严格执行，避免情绪化操作。考虑定投策略。',
          triggeredAt: new Date(),
          isRead: false,
          isDismissed: false,
        };
      }
    }

    return null;
  }

  /**
   * 检测频繁交易
   */
  private async detectFrequentTrading(userId: string): Promise<BehaviorIntervention | null> {
    const windowMs = 30 * 24 * 60 * 60 * 1000; // 30天
    const cutoff = new Date(Date.now() - windowMs);
    
    const actionRecords = await this.actionRecordRepository.count({
      where: { userId, createTime: MoreThanOrEqual(cutoff) },
    });

    if (actionRecords > 10) {
      return {
        id: `trading_${Date.now()}`,
        type: 'frequent_trading',
        level: 'warning',
        title: '⚡ 交易频率过高',
        message: `您在过去30天内进行了${actionRecords}次调仓操作，交易频率较高。`,
        actionSuggestion: '建议：减少交易频率，长期持有优质资产。频繁交易可能增加成本和风险。',
        triggeredAt: new Date(),
        isRead: false,
        isDismissed: false,
      };
    }

    return null;
  }

  /**
   * 检测集中度风险
   */
  private async detectConcentrationRisk(userId: string): Promise<BehaviorIntervention | null> {
    const funds = await this.fundRepository.find({ where: { userId } });
    
    if (funds.length === 0) return null;

    const sectorMap: Record<string, number> = {};
    funds.forEach(fund => {
      sectorMap[fund.sector] = (sectorMap[fund.sector] || 0) + Number(fund.amount);
    });

    const totalAmount = Object.values(sectorMap).reduce((sum, amount) => sum + amount, 0);
    if (totalAmount === 0) return null;

    let maxSector = '';
    let maxRatio = 0;
    
    for (const [sector, amount] of Object.entries(sectorMap)) {
      const ratio = amount / totalAmount;
      if (ratio > maxRatio) {
        maxRatio = ratio;
        maxSector = sector;
      }
    }

    if (maxRatio > 0.6) {
      return {
        id: `concentration_${Date.now()}`,
        type: 'concentration_risk',
        level: 'danger',
        title: '⚠️ 持仓过于集中',
        message: `${maxSector}板块占您总投资的${(maxRatio * 100).toFixed(1)}%，集中度风险较高。`,
        actionSuggestion: '建议：适当分散投资，降低单一板块风险。考虑配置债券、现金等低风险资产。',
        triggeredAt: new Date(),
        isRead: false,
        isDismissed: false,
      };
    }

    return null;
  }

  /**
   * 获取用户行为干预提醒
   */
  async getUserInterventions(userId: string, limit: number = 50): Promise<BehaviorIntervention[]> {
    const interventions = this.behaviorInterventions.get(userId) || [];
    return interventions
      .filter(i => !i.isDismissed)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * 标记干预提醒为已读
   */
  async markInterventionAsRead(userId: string, interventionId: string): Promise<boolean> {
    const interventions = this.behaviorInterventions.get(userId) || [];
    const intervention = interventions.find(i => i.id === interventionId);
    
    if (intervention) {
      intervention.isRead = true;
      return true;
    }
    
    return false;
  }

  /**
   * 忽略干预提醒
   */
  async dismissIntervention(userId: string, interventionId: string): Promise<boolean> {
    const interventions = this.behaviorInterventions.get(userId) || [];
    const intervention = interventions.find(i => i.id === interventionId);
    
    if (intervention) {
      intervention.isDismissed = true;
      return true;
    }
    
    return false;
  }

  /**
   * 生成月度投资行为报告
   */
  async generateMonthlyReport(userId: string, month?: string): Promise<MonthlyReport> {
    const targetMonth = month || this.getCurrentMonth();
    
    try {
      // 计算月份范围
      const [year, mon] = targetMonth.split('-').map(Number);
      const startDate = new Date(year, mon - 1, 1);
      const endDate = new Date(year, mon, 0, 23, 59, 59);

      // 获取当月行为数据
      const behaviorLogs = await this.behaviorLogRepository.find({
        where: { userId, createdAt: MoreThanOrEqual(startDate) },
      });

      const actionRecords = await this.actionRecordRepository.find({
        where: { userId, createTime: MoreThanOrEqual(startDate) },
      });

      // 获取月末持仓数据
      const funds = await this.fundRepository.find({ where: { userId } });

      // 计算各项指标
      const totalActions = actionRecords.length;
      const panicEvents = this.countPanicEvents(behaviorLogs);
      const concentrationChanges = this.countConcentrationChanges(actionRecords);
      const sectorDistribution = this.calculateSectorDistribution(funds);
      const riskTrend = this.calculateRiskTrend(behaviorLogs);
      const behaviorInsights = this.generateBehaviorInsights(behaviorLogs, actionRecords);
      const recommendations = this.generateRecommendations(behaviorLogs, actionRecords, funds);

      const report: MonthlyReport = {
        userId,
        month: targetMonth,
        totalActions,
        panicEvents,
        concentrationChanges,
        sectorDistribution,
        riskTrend,
        behaviorInsights,
        recommendations,
        generatedAt: new Date(),
      };

      // 保存报告
      this.monthlyReports.set(`${userId}_${targetMonth}`, report);

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate monthly report for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 获取月度报告
   */
  async getMonthlyReport(userId: string, month: string): Promise<MonthlyReport | null> {
    return this.monthlyReports.get(`${userId}_${month}`) || null;
  }

  /**
   * 获取用户所有月度报告
   */
  async getUserReports(userId: string): Promise<MonthlyReport[]> {
    const reports: MonthlyReport[] = [];
    
    for (const [key, report] of this.monthlyReports) {
      if (key.startsWith(`${userId}_`)) {
        reports.push(report);
      }
    }

    return reports.sort((a, b) => b.month.localeCompare(a.month));
  }

  /**
   * 计算时间窗口内的行为频次
   */
  private calculateTimeWindows(records: any[], windowMs: number): Array<{ start: Date; end: Date; count: number; duration: number }> {
    if (records.length === 0) return [];

    const windows: Array<{ start: Date; end: Date; count: number; duration: number }> = [];
    
    for (let i = 0; i < records.length; i++) {
      const startTime = new Date(records[i].createdAt);
      const endTime = new Date(startTime.getTime() + windowMs);
      
      const windowRecords = records.filter(r => 
        r.createdAt >= startTime && r.createdAt <= endTime
      );
      
      windows.push({
        start: startTime,
        end: endTime,
        count: windowRecords.length,
        duration: windowMs,
      });
    }

    return windows.sort((a, b) => b.count - a.count);
  }

  /**
   * 计算恐慌事件数量
   */
  private countPanicEvents(logs: BehaviorLog[]): number {
    let panicCount = 0;
    const refreshLogs = logs.filter(log => log.eventType === 'REFRESH');
    
    const windows = this.calculateTimeWindows(refreshLogs, 30 * 60 * 1000); // 30分钟窗口
    
    for (const window of windows) {
      if (window.count > 5) {
        panicCount++;
      }
    }

    return panicCount;
  }

  /**
   * 计算集中度变化次数
   */
  private countConcentrationChanges(actions: any[]): number {
    // 简化实现：计算加仓次数
    return actions.filter(action => action.actionType === 'add').length;
  }

  /**
   * 计算板块分布
   */
  private calculateSectorDistribution(funds: Fund[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const totalAmount = funds.reduce((sum, fund) => sum + Number(fund.amount), 0);

    if (totalAmount === 0) return distribution;

    funds.forEach(fund => {
      if (!distribution[fund.sector]) {
        distribution[fund.sector] = 0;
      }
      distribution[fund.sector] += Number(fund.amount) / totalAmount;
    });

    return distribution;
  }

  /**
   * 计算风险趋势
   */
  private calculateRiskTrend(logs: BehaviorLog[]): Array<{ date: string; score: number }> {
    const dailyScores: Record<string, number> = {};
    
    logs.forEach(log => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyScores[date]) {
        dailyScores[date] = 0;
      }
      
      // 根据行为类型计算风险分数
      switch (log.eventType) {
        case 'REFRESH':
          dailyScores[date] += 2;
          break;
        case 'PORTFOLIO_VIEW':
          dailyScores[date] += 1;
          break;
        case 'SIMULATE_SELL':
          dailyScores[date] += 3;
          break;
        default:
          dailyScores[date] += 1;
      }
    });

    return Object.entries(dailyScores)
      .map(([date, score]) => ({ date, score }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 生成行为洞察
   */
  private generateBehaviorInsights(logs: BehaviorLog[], actions: any[]): string[] {
    const insights: string[] = [];

    // 检查查看频率
    const viewCount = logs.filter(log => log.eventType === 'PORTFOLIO_VIEW').length;
    if (viewCount > 50) {
      insights.push('您查看账户的频率较高，建议设定固定的查看时间，避免情绪化决策。');
    }

    // 检查刷新频率
    const refreshCount = logs.filter(log => log.eventType === 'REFRESH').length;
    if (refreshCount > 20) {
      insights.push('您经常刷新页面，这可能表明对市场波动过于敏感。建议培养长期投资的耐心。');
    }

    // 检查交易频率
    if (actions.length > 10) {
      insights.push('您的交易频率较高，建议减少操作，专注于长期投资策略。');
    }

    // 检查模拟卖出行为
    const simulateCount = logs.filter(log => log.eventType === 'SIMULATE_SELL').length;
    if (simulateCount > 5) {
      insights.push('您多次模拟卖出，这可能反映了对持仓的不确定感。建议回顾投资计划，坚持既定策略。');
    }

    if (insights.length === 0) {
      insights.push('您的投资行为相对理性，继续保持良好的投资习惯。');
    }

    return insights;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(logs: BehaviorLog[], actions: any[], funds: Fund[]): string[] {
    const recommendations: string[] = [];

    // 根据行为数据给出建议
    const viewCount = logs.filter(log => log.eventType === 'PORTFOLIO_VIEW').length;
    if (viewCount > 30) {
      recommendations.push('设定每日固定的查看时间（如收盘后），避免盘中频繁查看影响情绪。');
    }

    // 根据持仓给出建议
    const sectorMap: Record<string, number> = {};
    funds.forEach(fund => {
      sectorMap[fund.sector] = (sectorMap[fund.sector] || 0) + Number(fund.amount);
    });

    const totalAmount = Object.values(sectorMap).reduce((sum, amount) => sum + amount, 0);
    if (totalAmount > 0) {
      const maxSectorRatio = Math.max(...Object.values(sectorMap).map(amount => amount / totalAmount));
      if (maxSectorRatio > 0.5) {
        recommendations.push('您的持仓过于集中，建议适当分散投资，降低单一板块风险。');
      }
    }

    // 根据交易频率给出建议
    if (actions.length > 5) {
      recommendations.push('考虑采用定投策略，减少择时操作，降低交易成本。');
    }

    if (recommendations.length === 0) {
      recommendations.push('继续保持当前的投资策略，定期回顾和调整资产配置。');
    }

    return recommendations;
  }

  /**
   * 获取当前月份
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 定期任务：检查用户行为异常
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkBehaviorAnomalies() {
    try {
      this.logger.log('Checking behavior anomalies...');
      
      // 这里可以实现批量检查所有活跃用户的行为异常
      // 暂时跳过具体实现
    } catch (error) {
      this.logger.error('Failed to check behavior anomalies:', error);
    }
  }

  /**
   * 定期任务：生成月度报告
   */
  @Cron('0 0 1 * *') // 每月1日执行
  async generateMonthlyReports() {
    try {
      this.logger.log('Generating monthly reports...');
      
      // 这里可以实现批量生成所有活跃用户的月度报告
      // 暂时跳过具体实现
    } catch (error) {
      this.logger.error('Failed to generate monthly reports:', error);
    }
  }
}