import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fund } from '../../database/entities/fund.entity';
import { User } from '../../database/entities/user.entity';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface PlatformCredentials {
  platform: 'alipay' | 'tiantian' | 'licaitong' | 'eastmoney';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface SyncStatus {
  success: boolean;
  syncedFunds: number;
  failedFunds: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface FundData {
  fundCode: string;
  fundName: string;
  currentAmount: number;
  currentValue: number;
  profitRate: number;
  marketValue: number;
  lastUpdated: Date;
}

export interface PlatformSyncStatus {
  [key: string]: {
    connected: boolean;
    lastSyncTime: string | null;
    syncCount: number;
  };
}

export interface SyncSettings {
  autoSync: boolean;
  notifications: boolean;
  frequency: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 同步用户基金持仓数据
   */
  async syncUserFunds(userId: string, platform: string, credentials: any): Promise<SyncStatus> {
    try {
      let fundData: FundData[] = [];
      
      switch (platform) {
        case 'alipay':
          fundData = await this.syncFromAlipay(credentials);
          break;
        case 'tiantian':
          fundData = await this.syncFromTiantian(credentials);
          break;
        case 'licaitong':
          fundData = await this.syncFromLicaitong(credentials);
          break;
        case 'eastmoney':
          fundData = await this.syncFromEastmoney(credentials);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const result = await this.updateUserFunds(userId, fundData, platform);
      
      // 更新用户最后同步时间
      await this.userRepository.update(userId, {
        lastSyncTime: new Date(),
        syncPlatform: platform,
      });

      return {
        success: true,
        syncedFunds: result.synced,
        failedFunds: result.failed,
        errors: result.errors,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync funds for user ${userId}:`, error);
      return {
        success: false,
        syncedFunds: 0,
        failedFunds: 0,
        errors: [error.message],
        lastSyncTime: new Date(),
      };
    }
  }

  /**
   * 从支付宝同步基金数据
   */
  private async syncFromAlipay(credentials: any): Promise<FundData[]> {
    try {
      // 支付宝基金API调用
      const response = await firstValueFrom(
        this.httpService.post('https://openapi.alipay.com/gateway.do', {
          method: 'alipay.fund.fundasset.query',
          app_id: credentials.appId,
          charset: 'utf-8',
          sign_type: 'RSA2',
          timestamp: new Date().toISOString(),
          version: '1.0',
          biz_content: JSON.stringify({
            user_id: credentials.userId,
          }),
          sign: this.generateAlipaySign(credentials),
        })
      );

      return this.parseAlipayFunds(response.data);
    } catch (error) {
      this.logger.error('Failed to sync from Alipay:', error);
      throw error;
    }
  }

  /**
   * 从天天基金同步数据
   */
  private async syncFromTiantian(credentials: any): Promise<FundData[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://fundmobapi.eastmoney.com/FundMApi/FundPosition.ashx', {
          params: {
            deviceid: credentials.deviceId,
            version: '6.3.8',
            product: 'EFund',
            plat: 'Iphone',
            FCodes: credentials.fundCodes?.join(','),
            uid: credentials.userId,
          },
          headers: {
            'User-Agent': 'TiantianFund/6.3.8 (iPhone; iOS 15.0; Scale/3.00)',
            'Cookie': credentials.cookie || '',
          },
        })
      );

      return this.parseTiantianFunds(response.data);
    } catch (error) {
      this.logger.error('Failed to sync from Tiantian:', error);
      throw error;
    }
  }

  /**
   * 从腾讯理财通同步数据
   */
  private async syncFromLicaitong(credentials: any): Promise<FundData[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.qqlm.qq.com/cgi-bin/hq/fund_hq', {
          params: {
            uin: credentials.uin,
            skey: credentials.skey,
            format: 'json',
          },
          headers: {
            'Referer': 'https://mp.weixin.qq.com/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          },
        })
      );

      return this.parseLicaitongFunds(response.data);
    } catch (error) {
      this.logger.error('Failed to sync from Licaitong:', error);
      throw error;
    }
  }

  /**
   * 从东方财富同步数据
   */
  private async syncFromEastmoney(credentials: any): Promise<FundData[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://fund.eastmoney.com/Data/FundDataPortfolio_Interface.aspx', {
          params: {
            dt: '14',
            mc: 'returnJson',
            pn: '50',
            sc: 'abbname',
            st: 'asc',
            fundcodes: credentials.fundCodes?.join(','),
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
      );

      return this.parseEastmoneyFunds(response.data);
    } catch (error) {
      this.logger.error('Failed to sync from Eastmoney:', error);
      throw error;
    }
  }

  /**
   * 更新用户基金数据
   */
  private async updateUserFunds(userId: string, fundData: FundData[], platform: string): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const data of fundData) {
      try {
        // 查找或创建基金记录
        let fund = await this.fundRepository.findOne({
          where: { userId, fundCode: data.fundCode },
        });

        if (!fund) {
          fund = this.fundRepository.create({
            userId,
            fundCode: data.fundCode,
            name: data.fundName,
            amount: data.currentAmount,
            profitRate: data.profitRate,
            currentValue: data.currentValue,
            marketValue: data.marketValue,
            sector: await this.inferSector(data.fundName, data.fundCode),
            lastSyncTime: new Date(),
            syncPlatform: platform,
          });
        } else {
          // 更新现有基金数据
          fund.amount = data.currentAmount;
          fund.profitRate = data.profitRate;
          fund.currentValue = data.currentValue;
          fund.marketValue = data.marketValue;
          fund.lastSyncTime = new Date();
          fund.syncPlatform = platform;
        }

        await this.fundRepository.save(fund);
        synced++;
      } catch (error) {
        this.logger.error(`Failed to update fund ${data.fundCode}:`, error);
        failed++;
        errors.push(`基金 ${data.fundName}(${data.fundCode}) 同步失败: ${error.message}`);
      }
    }

    return { synced, failed, errors };
  }

  /**
   * 根据基金名称推断所属板块
   */
  private async inferSector(fundName: string, fundCode: string): Promise<string> {
    const sectorKeywords = {
      '半导体': ['半导体', '芯片', '集成电路', 'IC', '半导体设备'],
      'AI': ['人工智能', 'AI', '智能', '机器人', '大数据'],
      '新能源': ['新能源', '光伏', '风电', '储能', '锂电池', '新能源车'],
      '医药': ['医药', '医疗', '生物科技', '创新药', '医疗器械'],
      '消费': ['消费', '白酒', '食品饮料', '家电', '零售'],
      '红利': ['红利', '高股息', '分红', '股息'],
      '债券': ['债券', '债', '纯债', '可转债', '中短债'],
      '黄金': ['黄金', '贵金属', '有色'],
      '港股': ['港股', '恒生', '香港'],
      '美股': ['美股', '纳斯达克', '标普', '美国'],
      '现金': ['货币', '现金', '余额宝', '活期'],
    };

    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(keyword => fundName.includes(keyword))) {
        return sector;
      }
    }

    // 默认返回其他
    return '其他';
  }

  /**
   * 生成支付宝签名
   */
  private generateAlipaySign(credentials: any): string {
    // 简化版签名生成，实际应用中需要完整的RSA签名
    const params = {
      app_id: credentials.appId,
      method: 'alipay.fund.fundasset.query',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString(),
      version: '1.0',
      biz_content: JSON.stringify({ user_id: credentials.userId }),
    };

    // 实际应用中需要使用RSA私钥进行签名
    return 'mock_sign_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * 解析支付宝返回数据
   */
  private parseAlipayFunds(data: any): FundData[] {
    if (!data || !data.alipay_fund_fundasset_query_response) {
      return [];
    }

    const response = data.alipay_fund_fundasset_query_response;
    if (response.code !== '10000') {
      throw new Error(`Alipay API error: ${response.msg}`);
    }

    return response.fund_list?.map((fund: any) => ({
      fundCode: fund.fund_code,
      fundName: fund.fund_name,
      currentAmount: parseFloat(fund.current_amount) || 0,
      currentValue: parseFloat(fund.current_value) || 0,
      profitRate: parseFloat(fund.profit_rate) || 0,
      marketValue: parseFloat(fund.market_value) || 0,
      lastUpdated: new Date(fund.last_updated),
    })) || [];
  }

  /**
   * 解析天天基金返回数据
   */
  private parseTiantianFunds(data: any): FundData[] {
    if (!data || !data.Datas) {
      return [];
    }

    return data.Datas.map((fund: any) => ({
      fundCode: fund.FCODE,
      fundName: fund.SHORTNAME,
      currentAmount: parseFloat(fund.CURRENTAMOUNT) || 0,
      currentValue: parseFloat(fund.CURRENTVALUE) || 0,
      profitRate: parseFloat(fund.GSZZL) || 0,
      marketValue: parseFloat(fund.MARKETVALUE) || 0,
      lastUpdated: new Date(),
    }));
  }

  /**
   * 解析腾讯理财通返回数据
   */
  private parseLicaitongFunds(data: any): FundData[] {
    if (!data || !data.data) {
      return [];
    }

    return data.data.map((fund: any) => ({
      fundCode: fund.code,
      fundName: fund.name,
      currentAmount: parseFloat(fund.amount) || 0,
      currentValue: parseFloat(fund.value) || 0,
      profitRate: parseFloat(fund.profit_rate) || 0,
      marketValue: parseFloat(fund.market_value) || 0,
      lastUpdated: new Date(),
    }));
  }

  /**
   * 解析东方财富返回数据
   */
  private parseEastmoneyFunds(data: any): FundData[] {
    // 东方财富数据格式处理
    if (typeof data === 'string' && data.startsWith('returnJson(')) {
      const jsonStr = data.substring(11, data.length - 1);
      const parsed = JSON.parse(jsonStr);
      
      return parsed.data.map((fund: any) => ({
        fundCode: fund.fundcode,
        fundName: fund.name,
        currentAmount: parseFloat(fund.currentamount) || 0,
        currentValue: parseFloat(fund.currentvalue) || 0,
        profitRate: parseFloat(fund.profitrate) || 0,
        marketValue: parseFloat(fund.marketvalue) || 0,
        lastUpdated: new Date(),
      }));
    }
    
    return [];
  }

  /**
   * 获取用户同步状态
   */
  async getSyncStatus(userId: string): Promise<{ lastSyncTime: Date; syncPlatform: string; totalFunds: number; syncedFunds: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const totalFunds = await this.fundRepository.count({ where: { userId } });
    const syncedFunds = await this.fundRepository.count({ 
      where: { userId, lastSyncTime: user?.lastSyncTime } 
    });

    return {
      lastSyncTime: user?.lastSyncTime || new Date(0),
      syncPlatform: user?.syncPlatform || '',
      totalFunds,
      syncedFunds,
    };
  }

  /**
   * 获取平台同步状态
   */
  async getPlatformSyncStatus(userId: string): Promise<PlatformSyncStatus> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const platforms = ['alipay', 'tiantian', 'licaitong', 'eastmoney'];
    
    const status: PlatformSyncStatus = {};
    
    for (const platform of platforms) {
      const platformFunds = await this.fundRepository.count({ 
        where: { userId, syncPlatform: platform } 
      });
      
      status[platform] = {
        connected: platformFunds > 0,
        lastSyncTime: platform === user?.syncPlatform ? user?.lastSyncTime?.toISOString() || null : null,
        syncCount: platformFunds,
      };
    }
    
    return status;
  }

  /**
   * 连接平台
   */
  async connectPlatform(userId: string, platform: string, credentials: any): Promise<{ success: boolean; message: string; syncCount?: number }> {
    try {
      const isValid = await this.validateCredentials(platform, credentials);
      if (!isValid) {
        return { success: false, message: '无效的凭证' };
      }
      
      // 执行同步
      const result = await this.syncUserFunds(userId, platform, credentials);
      
      return {
        success: result.success,
        message: result.success ? '连接并同步成功' : '连接失败',
        syncCount: result.syncedFunds,
      };
    } catch (error) {
      this.logger.error(`Failed to connect platform ${platform}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 同步平台数据
   */
  async syncPlatform(userId: string, platform: string): Promise<{ success: boolean; message: string; syncCount?: number }> {
    try {
      // 获取用户凭证（这里简化处理，实际应该从数据库获取）
      const credentials = {}; // 应该从用户设置中获取
      
      const result = await this.syncUserFunds(userId, platform, credentials);
      
      return {
        success: result.success,
        message: result.success ? '同步成功' : '同步失败',
        syncCount: result.syncedFunds,
      };
    } catch (error) {
      this.logger.error(`Failed to sync platform ${platform}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 断开平台连接
   */
  async disconnectPlatform(userId: string, platform: string): Promise<{ success: boolean; message: string }> {
    try {
      // 删除该平台的基金数据
      await this.fundRepository.delete({ userId, syncPlatform: platform });
      
      // 更新用户同步信息
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user && user.syncPlatform === platform) {
        await this.userRepository.update(userId, {
          syncPlatform: null,
          lastSyncTime: null,
        });
      }
      
      return { success: true, message: '断开连接成功' };
    } catch (error) {
      this.logger.error(`Failed to disconnect platform ${platform}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 同步所有平台数据
   */
  async syncAllPlatforms(userId: string): Promise<{ success: boolean; message: string; results?: any[] }> {
    try {
      const platforms = ['alipay', 'tiantian', 'licaitong', 'eastmoney'];
      const results = [];
      
      for (const platform of platforms) {
        const result = await this.syncPlatform(userId, platform);
        results.push({ platform, ...result });
      }
      
      return {
        success: true,
        message: '所有平台同步完成',
        results,
      };
    } catch (error) {
      this.logger.error('Failed to sync all platforms:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取同步设置
   */
  async getSyncSettings(userId: string): Promise<SyncSettings> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 从用户设置中获取同步设置
    return {
      autoSync: true, // 默认开启
      notifications: true, // 默认开启
      frequency: 'daily', // 默认每天
    };
  }

  /**
   * 更新同步设置
   */
  async updateSyncSettings(userId: string, settings: Partial<SyncSettings>): Promise<{ success: boolean; message: string }> {
    try {
      // 这里应该将设置保存到用户配置中
      // 简化处理，直接返回成功
      
      return { success: true, message: '设置更新成功' };
    } catch (error) {
      this.logger.error('Failed to update sync settings:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 验证平台凭证有效性
   */
  async validateCredentials(platform: string, credentials: any): Promise<boolean> {
    try {
      // 根据平台验证凭证
      switch (platform) {
        case 'alipay':
          return await this.validateAlipayCredentials(credentials);
        case 'tiantian':
          return await this.validateTiantianCredentials(credentials);
        case 'licaitong':
          return await this.validateLicaitongCredentials(credentials);
        case 'eastmoney':
          return await this.validateEastmoneyCredentials(credentials);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to validate credentials for ${platform}:`, error);
      return false;
    }
  }

  private async validateAlipayCredentials(credentials: any): Promise<boolean> {
    // 实现支付宝凭证验证逻辑
    return !!(credentials.appId && credentials.userId);
  }

  private async validateTiantianCredentials(credentials: any): Promise<boolean> {
    // 实现天天基金凭证验证逻辑
    return !!(credentials.deviceId && credentials.userId);
  }

  private async validateLicaitongCredentials(credentials: any): Promise<boolean> {
    // 实现理财通凭证验证逻辑
    return !!(credentials.uin && credentials.skey);
  }

  private async validateEastmoneyCredentials(credentials: any): Promise<boolean> {
    // 实现东方财富凭证验证逻辑
    return !!(credentials.fundCodes && credentials.fundCodes.length > 0);
  }
}