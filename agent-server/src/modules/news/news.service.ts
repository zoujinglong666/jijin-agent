import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NewsEvent as NewsEventEntity } from '../../database/entities/news-event.entity';
import type { NewsEvent } from '../../common/types';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private newsApiKey: string = '';
  private newsApiUrl: string = '';
  private fetchInterval: NodeJS.Timeout | null = null;
  private readonly EVENT_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(NewsEventEntity)
    private newsEventRepository: Repository<NewsEventEntity>,
    private configService: ConfigService,
  ) {
    this.newsApiKey = this.configService.get('NEWS_API_KEY', '');
    this.newsApiUrl = this.configService.get('NEWS_API_URL', '');
  }

  onModuleInit() {
    this.startFetchLoop();
    this.startCleanupLoop();
  }

  private startFetchLoop() {
    this.fetchNews();
    this.fetchInterval = setInterval(() => this.fetchNews(), 15 * 60 * 1000);
  }

  private startCleanupLoop() {
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private async fetchNews() {
    if (!this.newsApiKey || !this.newsApiUrl) {
      return;
    }

    try {
      const url = `${this.newsApiUrl}?apiKey=${this.newsApiKey}&category=business&language=zh&pageSize=20`;
      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.articles) {
        for (const article of data.articles) {
          const sectors = this.extractSectors(article.title + ' ' + (article.description || ''));
          if (sectors.length > 0) {
            await this.addEvent({
              title: article.title,
              content: article.description || '',
              source: article.source?.name || 'unknown',
              relatedSectors: sectors,
              impactLevel: this.assessImpact(article),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('News fetch failed', error instanceof Error ? error.message : String(error));
    }
  }

  private extractSectors(text: string): string[] {
    const sectorKeywords: Record<string, string[]> = {
      '半导体': ['半导体', '芯片', '晶圆', '封测', '光刻'],
      'AI': ['人工智能', 'AI', '大模型', 'GPT', '深度学习', '算力'],
      '新能源': ['新能源', '光伏', '锂电', '储能', '风电', '碳中和'],
      '医药': ['医药', '生物', '创新药', '医疗器械', 'CRO'],
      '消费': ['消费', '零售', '白酒', '食品', '旅游'],
      '红利': ['红利', '高股息', '分红'],
      '债券': ['债券', '国债', '利率', '央行', 'LPR'],
      '黄金': ['黄金', '贵金属', '避险'],
      '港股': ['港股', '恒生', '南向资金', '港交所'],
      '美股': ['美股', '纳斯达克', '标普', '道琼斯', '美联储'],
    };

    const found: string[] = [];
    Object.entries(sectorKeywords).forEach(([sector, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        found.push(sector);
      }
    });
    return found;
  }

  private assessImpact(article: any): 'low' | 'medium' | 'high' {
    const title = (article.title || '').toLowerCase();
    const highKeywords = ['暴跌', '崩盘', '危机', '黑天鹅', '闪崩', '熔断'];
    const mediumKeywords = ['下跌', '回调', '震荡', '风险', '警告', '减仓'];

    if (highKeywords.some(kw => title.includes(kw))) return 'high';
    if (mediumKeywords.some(kw => title.includes(kw))) return 'medium';
    return 'low';
  }

  private async cleanup() {
    const cutoff = new Date(Date.now() - this.EVENT_TTL_MS);
    await this.newsEventRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoff', { cutoff })
      .execute();
  }

  async getLatestEvents(sectors?: string[], limit: number = 10): Promise<NewsEventEntity[]> {
    const qb = this.newsEventRepository
      .createQueryBuilder('e')
      .orderBy('e.createdAt', 'DESC')
      .limit(limit);

    if (sectors && sectors.length > 0) {
      const conditions = sectors.map((sector, i) => `e.relatedSectors LIKE :sector${i}`).join(' OR ');
      const params: Record<string, string> = {};
      sectors.forEach((sector, i) => {
        params[`sector${i}`] = `%"${sector}"%`;
      });
      qb.where(conditions, params);
    }

    return qb.getMany();
  }

  async addEvent(event: Omit<NewsEventEntity, 'id' | 'createdAt'>): Promise<NewsEventEntity> {
    const entity = this.newsEventRepository.create(event);
    return this.newsEventRepository.save(entity);
  }

  calculateEventImpact(events: NewsEventEntity[], userSectors: string[]): number {
    const relevantEvents = events.filter(e =>
      e.relatedSectors?.some(s => userSectors.includes(s))
    );
    if (relevantEvents.length === 0) return 0;
    const impactMap: Record<string, number> = { low: 10, medium: 30, high: 60 };
    const totalImpact = relevantEvents.reduce((sum, e) => sum + (impactMap[e.impactLevel] || 10), 0);
    return Math.min(100, totalImpact / relevantEvents.length);
  }

  async getEventCount(sectors?: string[]): Promise<number> {
    if (!sectors) return this.newsEventRepository.count();
    const qb = this.newsEventRepository.createQueryBuilder('e');
    const conditions = sectors.map((sector, i) => `e.relatedSectors LIKE :sector${i}`).join(' OR ');
    const params: Record<string, string> = {};
    sectors.forEach((sector, i) => {
      params[`sector${i}`] = `%"${sector}"%`;
    });
    qb.where(conditions, params);
    return qb.getCount();
  }
}
