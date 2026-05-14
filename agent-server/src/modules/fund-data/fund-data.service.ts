import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FundCacheEntity } from '../../database/entities/fund-cache.entity';
import { ConfigService } from '@nestjs/config';

export interface FundSearchResult {
  code: string;
  name: string;
  type: string;
  sector: string;
  latestNav: number | null;
  accNav: number | null;
  dayChange: number | null;
  weekChange: number | null;
  monthChange: number | null;
  threeMonthChange: number | null;
  yearChange: number | null;
  navDate: string | null;
}

const CODE_TO_SECTOR: Record<string, string> = {
  '半导体': '半导体', '芯片': '半导体', '集成电路': '半导体',
  '人工智能': 'AI', 'AI': 'AI', '大模型': 'AI', '算力': 'AI', '智能': 'AI',
  '新能源': '新能源', '光伏': '新能源', '锂电': '新能源', '储能': '新能源', '碳中和': '新能源', '风电': '新能源',
  '医药': '医药', '生物': '医药', '创新药': '医药', '医疗': '医药', '中药': '医药',
  '消费': '消费', '白酒': '消费', '食品': '消费', '零售': '消费', '旅游': '消费',
  '红利': '红利', '高股息': '红利', '分红': '红利',
  '债券': '债券', '国债': '债券', '纯债': '债券', '利率': '债券',
  '黄金': '黄金', '贵金属': '黄金',
  '港股': '港股', '恒生': '港股', '港交所': '港股',
  '美股': '美股', '纳斯达克': '美股', '标普': '美股', 'QDII': '美股',
  '货币': '现金', '短债': '现金',
};

function guessSector(name: string, type: string): string {
  if (type === '货币型') return '现金';
  if (type === '债券型' || type === '理财型') return '债券';
  for (const [keyword, sector] of Object.entries(CODE_TO_SECTOR)) {
    if (name.includes(keyword)) return sector;
  }
  return '其他';
}

@Injectable()
export class FundDataService {
  private readonly logger = new Logger(FundDataService.name);
  private readonly eastMoneyBaseUrl = 'https://fundgz.1234567.com.cn';

  constructor(
    @InjectRepository(FundCacheEntity)
    private fundCacheRepository: Repository<FundCacheEntity>,
    private configService: ConfigService,
  ) {}

  async search(keyword: string, limit: number = 10): Promise<FundSearchResult[]> {
    const trimmed = keyword.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const isCode = /^\d{4,6}$/.test(trimmed);

    if (isCode) {
      const cached = await this.fundCacheRepository.findOne({ where: { code: trimmed } });
      if (cached) return [this.toResult(cached)];

      const live = await this.fetchFromEastMoney(trimmed);
      if (live) return live;
      return [];
    }

    const cached = await this.fundCacheRepository
      .createQueryBuilder('f')
      .where('f.name LIKE :kw OR f.code LIKE :kw', { kw: `%${trimmed}%` })
      .orderBy('f.updatedAt', 'DESC')
      .limit(limit)
      .getMany();

    if (cached.length > 0) return cached.map(c => this.toResult(c));

    return [];
  }

  async getFundDetail(code: string): Promise<FundSearchResult | null> {
    const cached = await this.fundCacheRepository.findOne({ where: { code } });
    if (cached) return this.toResult(cached);

    const live = await this.fetchFromEastMoney(code);
    return live?.[0] || null;
  }

  async syncNavForUser(codes: string[]): Promise<Map<string, FundSearchResult>> {
    const result = new Map<string, FundSearchResult>();

    for (const code of codes) {
      try {
        const detail = await this.getFundDetail(code);
        if (detail) result.set(code, detail);
      } catch {
        this.logger.warn(`Sync nav failed for ${code}`);
      }
    }

    return result;
  }

  private async fetchFromEastMoney(code: string): Promise<FundSearchResult[] | null> {
    try {
      const url = `${this.eastMoneyBaseUrl}/js/${code}.js`;
      const response = await fetch(url, {
        headers: { 'Referer': 'https://fund.eastmoney.com/' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const text = await response.text();
      const jsonMatch = text.match(/jsonpgz\((.*)\)/);
      if (!jsonMatch) return null;

      const data = JSON.parse(jsonMatch[1]);
      if (!data || data.fundcode !== code) return null;

      const entity = this.fundCacheRepository.create({
        code: data.fundcode,
        name: data.name,
        type: data.fundtype || '',
        sector: guessSector(data.name, data.fundtype || ''),
        latestNav: parseFloat(data.dwjz) || 0,
        accNav: parseFloat(data.ljjz) || 0,
        dayChange: parseFloat(data.gszzl) || 0,
        navDate: data.jzrq || '',
      });

      await this.fundCacheRepository.save(entity).catch(() => {});
      return [this.toResult(entity)];
    } catch (error) {
      this.logger.warn(`Fetch eastmoney failed for ${code}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private toResult(entity: FundCacheEntity): FundSearchResult {
    return {
      code: entity.code,
      name: entity.name,
      type: entity.type || '',
      sector: entity.sector || '其他',
      latestNav: entity.latestNav,
      accNav: entity.accNav,
      dayChange: entity.dayChange,
      weekChange: entity.weekChange,
      monthChange: entity.monthChange,
      threeMonthChange: entity.threeMonthChange,
      yearChange: entity.yearChange,
      navDate: entity.navDate,
    };
  }
}
