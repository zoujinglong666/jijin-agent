import { Test, TestingModule } from '@nestjs/testing';
import { RegretService } from './regret.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';

describe('RegretService', () => {
  let service: RegretService;

  const mockPortfolioService = {
    getFunds: jest.fn().mockResolvedValue([]),
    getTotalAmount: jest.fn().mockResolvedValue(10000),
    getSectorRatios: jest.fn().mockResolvedValue({}),
    getHighVolatilityRatio: jest.fn().mockResolvedValue(0.3),
    getMaxSectorConcentration: jest.fn().mockResolvedValue({ sector: '消费', ratio: 0.3 }),
  };

  const mockBehaviorService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegretService,
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: BehaviorService, useValue: mockBehaviorService },
      ],
    }).compile();

    service = module.get<RegretService>(RegretService);
    jest.clearAllMocks();
  });

  describe('getScenarios', () => {
    it('should return 3 regret scenarios', () => {
      const scenarios = service.getScenarios();
      expect(scenarios.length).toBe(3);
      expect(scenarios.map(s => s.id)).toEqual(['reduce_semi', 'no_chase', 'no_reduce']);
    });

    it('each scenario should have required fields', () => {
      const scenarios = service.getScenarios();
      scenarios.forEach(s => {
        expect(s.id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(s.desc).toBeTruthy();
        expect(s.icon).toBeTruthy();
        expect(s.iconColor).toBeTruthy();
        expect(s.bgColor).toBeTruthy();
      });
    });
  });

  describe('runSimulation - reduce_semi', () => {
    it('should simulate reducing semiconductor position', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([
        { sector: '半导体', amount: 5000, profitRate: 0.15 },
        { sector: '消费', amount: 5000, profitRate: 0.05 },
      ]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 0.5, amount: 5000 },
        '消费': { ratio: 0.5, amount: 5000 },
      });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.5);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '半导体', ratio: 0.5 });

      const result = await service.runSimulation('u1', 'reduce_semi');
      expect(result.scenarioTitle).toContain('半导体');
      expect(result.volatilityChange).toBeLessThan(0);
      expect(result.sectorImpacts.length).toBeGreaterThan(0);
    });

    it('should handle no semiconductor holdings', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([{ sector: '消费', amount: 10000, profitRate: 0.05 }]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({ '消费': { ratio: 1.0, amount: 10000 } });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '消费', ratio: 1.0 });

      const result = await service.runSimulation('u1', 'reduce_semi');
      expect(result.insight).toContain('没有半导体持仓');
    });
  });

  describe('runSimulation - no_chase', () => {
    it('should simulate not chasing high returns', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([
        { sector: '半导体', amount: 5000, profitRate: 0.2 },
        { sector: '消费', amount: 5000, profitRate: 0.05 },
      ]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 0.5, amount: 5000 },
        '消费': { ratio: 0.5, amount: 5000 },
      });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.5);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '半导体', ratio: 0.5 });

      const result = await service.runSimulation('u1', 'no_chase');
      expect(result.scenarioTitle).toContain('追涨');
      expect(result.insight).toBeTruthy();
    });

    it('should handle no high-profit funds', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([{ sector: '消费', amount: 10000, profitRate: 0.02 }]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({ '消费': { ratio: 1.0, amount: 10000 } });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '消费', ratio: 1.0 });

      const result = await service.runSimulation('u1', 'no_chase');
      expect(result.insight).toContain('理性');
    });
  });

  describe('runSimulation - no_reduce', () => {
    it('should simulate not reducing during downturn', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([
        { sector: '半导体', amount: 5000, profitRate: -0.1 },
        { sector: '消费', amount: 5000, profitRate: 0.05 },
      ]);
      mockPortfolioService.getTotalAmount.mockResolvedValue(10000);
      mockPortfolioService.getSectorRatios.mockResolvedValue({
        '半导体': { ratio: 0.5, amount: 5000 },
        '消费': { ratio: 0.5, amount: 5000 },
      });
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0.5);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '半导体', ratio: 0.5 });

      const result = await service.runSimulation('u1', 'no_reduce');
      expect(result.scenarioTitle).toContain('减仓');
      expect(result.insight).toBeTruthy();
    });
  });

  describe('runSimulation - unknown scenario', () => {
    it('should return unknown scenario insight', async () => {
      mockPortfolioService.getFunds.mockResolvedValue([]);
      mockPortfolioService.getSectorRatios.mockResolvedValue({});
      mockPortfolioService.getHighVolatilityRatio.mockResolvedValue(0);
      mockPortfolioService.getMaxSectorConcentration.mockResolvedValue({ sector: '', ratio: 0 });

      const result = await service.runSimulation('u1', 'unknown_scenario');
      expect(result.insight).toBe('未知场景');
    });
  });
});