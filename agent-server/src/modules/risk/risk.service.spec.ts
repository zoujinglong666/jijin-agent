import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskService } from './risk.service';
import { RiskSnapshot } from '../../database/entities/risk-snapshot.entity';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';
import { NewsService } from '../news/news.service';

describe('RiskService', () => {
  let service: RiskService;
  let portfolioService: PortfolioService;
  let behaviorService: BehaviorService;
  let newsService: NewsService;

  const mockRiskRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockPortfolioService = {
    getMaxSectorConcentration: jest.fn(),
    getHighVolatilityRatio: jest.fn(),
    getSectorRatios: jest.fn(),
    getFunds: jest.fn(),
    getTotalAmount: jest.fn(),
  };

  const mockBehaviorService = {
    getBehaviorState: jest.fn(),
  };

  const mockNewsService = {
    getLatestEvents: jest.fn().mockResolvedValue([]),
    calculateEventImpact: jest.fn().mockReturnValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        { provide: getRepositoryToken(RiskSnapshot), useValue: mockRiskRepo },
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: BehaviorService, useValue: mockBehaviorService },
        { provide: NewsService, useValue: mockNewsService },
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);
    portfolioService = module.get(PortfolioService);
    behaviorService = module.get(BehaviorService);
    newsService = module.get(NewsService);
    jest.clearAllMocks();
  });

  describe('calculateRisk', () => {
    it('should calculate risk with safe level when portfolio is diversified', async () => {
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '消费', ratio: 0.2 });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.1);
      mockPortfolioService.getSectorRatios.mockResolvedValue({ '消费': { ratio: 0.2 } });
      mockBehaviorService.getBehaviorState.mockResolvedValue({ score: 10, level: 'calm' });
      mockNewsService.getLatestEvents.mockResolvedValue([]);
      mockNewsService.calculateEventImpact.mockReturnValue(0);
      mockRiskRepo.create.mockReturnValue({});
      mockRiskRepo.save.mockResolvedValue({});

      const result = await service.calculateRisk('u1');
      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('safe');
    });

    it('should calculate risk with danger level when highly concentrated', async () => {
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '半导体', ratio: 0.8 });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.9);
      mockPortfolioService.getSectorRatios.mockResolvedValue({ '半导体': { ratio: 0.8 } });
      mockBehaviorService.getBehaviorState.mockResolvedValue({ score: 80, level: 'panic' });
      mockNewsService.getLatestEvents.mockResolvedValue([{ impactLevel: 'high' }]);
      mockNewsService.calculateEventImpact.mockReturnValue(60);
      mockRiskRepo.create.mockReturnValue({});
      mockRiskRepo.save.mockResolvedValue({});

      const result = await service.calculateRisk('u1');
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.level).toBe('danger');
    });

    it('should save risk snapshot after calculation', async () => {
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '消费', ratio: 0.1 });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0);
      mockPortfolioService.getSectorRatios.mockResolvedValue({});
      mockBehaviorService.getBehaviorState.mockResolvedValue({ score: 0, level: 'calm' });
      mockRiskRepo.create.mockReturnValue({});
      mockRiskRepo.save.mockResolvedValue({});

      await service.calculateRisk('u1');
      expect(mockRiskRepo.save).toHaveBeenCalled();
    });
  });

  describe('runStressTest', () => {
    it('should return zero impact when total is 0', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(0);

      const scenario = { id: 'test', name: 'test', description: '', sector: '半导体', dropPercent: 10, isCustom: false };
      const result = await service.runStressTest('u1', scenario);
      expect(result.portfolioDrop).toBe(0);
      expect(result.lossAmount).toBe(0);
    });

    it('should calculate sector-specific stress test', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([{ sector: '半导体', amount: 5000 }]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 0.5, amount: 5000 },
        '消费': { ratio: 0.5, amount: 5000 },
      });

      const scenario = { id: 'semi_5', name: '半导体下跌5%', description: '', sector: '半导体', dropPercent: 5, isCustom: false };
      const result = await service.runStressTest('u1', scenario);
      expect(result.portfolioDrop).toBeGreaterThan(0);
      expect(result.lossAmount).toBeGreaterThan(0);
    });

    it('should handle full market drop scenario', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([{ sector: '半导体', amount: 10000 }]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 1.0, amount: 10000 },
      });

      const scenario = { id: 'market_10', name: '市场整体回撤', description: '', sector: '全部', dropPercent: 10, isCustom: false };
      const result = await service.runStressTest('u1', scenario);
      expect(result.portfolioDrop).toBe(10);
      expect(result.lossAmount).toBe(1000);
    });
  });

  describe('getDefaultScenarios', () => {
    it('should return 6 default scenarios', () => {
      const scenarios = service.getDefaultScenarios();
      expect(scenarios.length).toBe(6);
      expect(scenarios[0].sector).toBe('半导体');
    });
  });

  describe('getAlerts', () => {
    it('should return concentration alerts', async () => {
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 0.5, amount: 5000, fundCount: 3 },
      });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.5);
      mockPortfolioService.getFunds.mockResolvedValue([
        { sector: '半导体', amount: 5000 },
        { sector: '半导体', amount: 2000 },
        { sector: '半导体', amount: 1000 },
      ]);

      const alerts = await service.getAlerts('u1');
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});