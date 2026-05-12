import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NewsService } from './news.service';
import { NewsEvent } from '../../database/entities/news-event.entity';

describe('NewsService', () => {
  let service: NewsService;

  const mockNewsEventRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    }),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(''),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: getRepositoryToken(NewsEvent), useValue: mockNewsEventRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    jest.clearAllMocks();
  });

  describe('calculateEventImpact', () => {
    it('should return 0 when no events', () => {
      const result = service.calculateEventImpact([], ['半导体']);
      expect(result).toBe(0);
    });

    it('should return 0 when no relevant events', () => {
      const events = [{ relatedSectors: ['医药'], impactLevel: 'high' }] as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBe(0);
    });

    it('should calculate impact for relevant low-impact events', () => {
      const events = [{ relatedSectors: ['半导体'], impactLevel: 'low' }] as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBe(10);
    });

    it('should calculate impact for relevant medium-impact events', () => {
      const events = [{ relatedSectors: ['半导体'], impactLevel: 'medium' }] as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBe(30);
    });

    it('should calculate impact for relevant high-impact events', () => {
      const events = [{ relatedSectors: ['半导体'], impactLevel: 'high' }] as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBe(60);
    });

    it('should average multiple relevant events', () => {
      const events = [
        { relatedSectors: ['半导体'], impactLevel: 'high' },
        { relatedSectors: ['半导体'], impactLevel: 'low' },
      ] as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBe(35);
    });

    it('should cap impact at 100', () => {
      const events = Array(10).fill(null).map(() => ({
        relatedSectors: ['半导体'], impactLevel: 'high',
      })) as any;
      const result = service.calculateEventImpact(events, ['半导体']);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('addEvent', () => {
    it('should create and save event', async () => {
      mockNewsEventRepo.create.mockReturnValue({ title: 'test' });
      mockNewsEventRepo.save.mockResolvedValue({ title: 'test' });

      const event = { title: 'test', content: '', source: 'test', relatedSectors: ['半导体'], impactLevel: 'low' as const };
      await service.addEvent(event);
      expect(mockNewsEventRepo.create).toHaveBeenCalledWith(event);
      expect(mockNewsEventRepo.save).toHaveBeenCalled();
    });
  });

  describe('getLatestEvents', () => {
    it('should query events with default limit', async () => {
      const qb = mockNewsEventRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      const events = await service.getLatestEvents(['半导体'], 10);
      expect(mockNewsEventRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getEventCount', () => {
    it('should return total count when no sectors specified', async () => {
      mockNewsEventRepo.count.mockResolvedValue(5);
      const count = await service.getEventCount();
      expect(count).toBe(5);
    });
  });
});