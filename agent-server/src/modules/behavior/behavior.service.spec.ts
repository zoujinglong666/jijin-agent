import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BehaviorService } from './behavior.service';
import { BehaviorLog } from '../../database/entities/behavior-log.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';
import { Fund } from '../../database/entities/fund.entity';

describe('BehaviorService', () => {
  let service: BehaviorService;

  const mockBehaviorLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockActionRecordRepo = {
    count: jest.fn().mockResolvedValue(0),
  };

  const mockFundRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehaviorService,
        { provide: getRepositoryToken(BehaviorLog), useValue: mockBehaviorLogRepo },
        { provide: getRepositoryToken(ActionRecord), useValue: mockActionRecordRepo },
        { provide: getRepositoryToken(Fund), useValue: mockFundRepo },
      ],
    }).compile();

    service = module.get<BehaviorService>(BehaviorService);
    jest.clearAllMocks();
  });

  describe('recordEvent', () => {
    it('should create and save behavior log', async () => {
      mockBehaviorLogRepo.create.mockReturnValue({ userId: 'u1', eventType: 'APP_OPEN', payload: '' });
      mockBehaviorLogRepo.save.mockResolvedValue({});

      await service.recordEvent('u1', 'APP_OPEN');
      expect(mockBehaviorLogRepo.create).toHaveBeenCalledWith({ userId: 'u1', eventType: 'APP_OPEN', payload: '' });
      expect(mockBehaviorLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('getBehaviorState', () => {
    it('should return calm state when no recent records', async () => {
      mockBehaviorLogRepo.find.mockResolvedValue([]);

      const state = await service.getBehaviorState('u1');
      expect(state.score).toBe(0);
      expect(state.level).toBe('calm');
      expect(state.openFrequency).toBe(0);
    });

    it('should calculate score based on event frequencies', async () => {
      const records = [
        { userId: 'u1', eventType: 'APP_OPEN', createdAt: new Date() },
        { userId: 'u1', eventType: 'APP_OPEN', createdAt: new Date() },
        { userId: 'u1', eventType: 'PORTFOLIO_VIEW', createdAt: new Date() },
        { userId: 'u1', eventType: 'REFRESH', createdAt: new Date() },
      ];
      mockBehaviorLogRepo.find.mockResolvedValue(records);

      const state = await service.getBehaviorState('u1');
      expect(state.openFrequency).toBe(2);
      expect(state.portfolioViewCount).toBe(1);
      expect(state.refreshFrequency).toBe(1);
      expect(state.score).toBeGreaterThan(0);
    });

    it('should return panic level for high activity', async () => {
      const records = [
        ...Array(100).fill(null).map(() => ({ userId: 'u1', eventType: 'APP_OPEN', createdAt: new Date() })),
        ...Array(100).fill(null).map(() => ({ userId: 'u1', eventType: 'PORTFOLIO_VIEW', createdAt: new Date() })),
        ...Array(100).fill(null).map(() => ({ userId: 'u1', eventType: 'REFRESH', createdAt: new Date() })),
        ...Array(100).fill(null).map(() => ({ userId: 'u1', eventType: 'SIMULATE_SELL', createdAt: new Date() })),
      ];
      mockBehaviorLogRepo.find.mockResolvedValue(records);

      const state = await service.getBehaviorState('u1');
      expect(state.score).toBe(100);
      expect(state.level).toBe('panic');
    });
  });

  describe('isPanicBehavior', () => {
    it('should return false when not in panic', async () => {
      mockBehaviorLogRepo.find.mockResolvedValue([]);
      const result = await service.isPanicBehavior('u1');
      expect(result).toBe(false);
    });
  });

  describe('isAnxietyBehavior', () => {
    it('should return false when portfolio views are low', async () => {
      mockBehaviorLogRepo.find.mockResolvedValue([]);
      const result = await service.isAnxietyBehavior('u1');
      expect(result).toBe(false);
    });

    it('should return true when portfolio views exceed 10', async () => {
      const records = Array(11).fill(null).map(() => ({
        userId: 'u1', eventType: 'PORTFOLIO_VIEW', createdAt: new Date(),
      }));
      mockBehaviorLogRepo.find.mockResolvedValue(records);

      const result = await service.isAnxietyBehavior('u1');
      expect(result).toBe(true);
    });
  });

  describe('getPersonality', () => {
    it('should return theme_gambler when concentration > 60%', async () => {
      mockFundRepo.find.mockResolvedValue([
        { sector: '半导体', amount: 7000 },
        { sector: '消费', amount: 3000 },
      ]);
      mockBehaviorLogRepo.count.mockResolvedValue(5);
      mockActionRecordRepo.count.mockResolvedValue(2);

      const personality = await service.getPersonality('u1');
      expect(personality.type).toBe('theme_gambler');
      expect(personality.label).toBe('主题赌徒型');
    });

    it('should return long_term_holder when no recent actions', async () => {
      mockFundRepo.find.mockResolvedValue([
        { sector: '消费', amount: 5000 },
        { sector: '债券', amount: 5000 },
      ]);
      mockBehaviorLogRepo.count.mockResolvedValue(2);
      mockActionRecordRepo.count.mockResolvedValue(0);

      const personality = await service.getPersonality('u1');
      expect(personality.type).toBe('long_term_holder');
    });

    it('should return balanced as default', async () => {
      mockFundRepo.find.mockResolvedValue([
        { sector: '消费', amount: 5000 },
        { sector: '半导体', amount: 3000 },
        { sector: '债券', amount: 2000 },
      ]);
      mockBehaviorLogRepo.count.mockResolvedValue(5);
      mockActionRecordRepo.count.mockResolvedValue(2);

      const personality = await service.getPersonality('u1');
      expect(['balanced', 'long_term_holder', 'diversified_safe']).toContain(personality.type);
    });
  });

  describe('getTags', () => {
    it('should return 5 behavior tags', async () => {
      mockFundRepo.find.mockResolvedValue([]);
      mockBehaviorLogRepo.count.mockResolvedValue(0);
      mockActionRecordRepo.count.mockResolvedValue(0);

      const tags = await service.getTags('u1');
      expect(tags.length).toBe(5);
      expect(tags[0].id).toBe('chase_rise');
    });

    it('should trigger chase_rise tag when recent add positions > 3', async () => {
      mockFundRepo.find.mockResolvedValue([]);
      mockBehaviorLogRepo.count.mockResolvedValue(4);
      mockActionRecordRepo.count.mockResolvedValue(0);

      const tags = await service.getTags('u1');
      const chaseRise = tags.find(t => t.id === 'chase_rise');
      expect(chaseRise?.triggered).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return behavior stats', async () => {
      mockBehaviorLogRepo.count.mockResolvedValue(5);
      mockActionRecordRepo.count.mockResolvedValue(3);

      const stats = await service.getStats('u1');
      expect(stats.viewCount).toBe(5);
      expect(stats.recentActions).toBe(3);
    });
  });

  describe('getLogs', () => {
    it('should return recent behavior logs', async () => {
      mockBehaviorLogRepo.find.mockResolvedValue([{ userId: 'u1', eventType: 'APP_OPEN' }]);

      const logs = await service.getLogs('u1');
      expect(logs.length).toBe(1);
      expect(mockBehaviorLogRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });
});