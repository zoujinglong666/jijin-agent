import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GrowthService } from './growth.service';
import { GrowthMetricsEntity } from '../../database/entities/growth-metrics.entity';

describe('GrowthService', () => {
  let service: GrowthService;

  const mockGrowthRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthService,
        { provide: getRepositoryToken(GrowthMetricsEntity), useValue: mockGrowthRepo },
      ],
    }).compile();

    service = module.get<GrowthService>(GrowthService);
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return existing metrics', async () => {
      const existing = { userId: 'u1', stableDays: 10, riskControlRate: 0.8, emotionStability: 0.7, longTermHoldIndex: 0.6 };
      mockGrowthRepo.findOne.mockResolvedValue(existing);

      const metrics = await service.getMetrics('u1');
      expect(metrics.stableDays).toBe(10);
      expect(metrics.riskControlRate).toBe(0.8);
    });

    it('should create default metrics when not found', async () => {
      mockGrowthRepo.findOne.mockResolvedValue(null);
      const defaultMetrics = { userId: 'u1', stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 };
      mockGrowthRepo.create.mockReturnValue(defaultMetrics);
      mockGrowthRepo.save.mockResolvedValue(defaultMetrics);

      const metrics = await service.getMetrics('u1');
      expect(mockGrowthRepo.create).toHaveBeenCalledWith({ userId: 'u1', stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 });
      expect(mockGrowthRepo.save).toHaveBeenCalled();
      expect(metrics.stableDays).toBe(0);
    });
  });

  describe('updateMetrics', () => {
    it('should update existing metrics', async () => {
      const existing = { userId: 'u1', stableDays: 5, riskControlRate: 0.5, emotionStability: 0.5, longTermHoldIndex: 0.5 };
      mockGrowthRepo.findOne.mockResolvedValue(existing);
      mockGrowthRepo.save.mockImplementation(async (m) => m);

      const updated = await service.updateMetrics('u1', { stableDays: 10, emotionStability: 0.8 });
      expect(updated.stableDays).toBe(10);
      expect(updated.emotionStability).toBe(0.8);
      expect(updated.riskControlRate).toBe(0.5);
    });

    it('should create and update when metrics not found', async () => {
      mockGrowthRepo.findOne.mockResolvedValue(null);
      const defaultMetrics = { userId: 'u1', stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 };
      mockGrowthRepo.create.mockReturnValue(defaultMetrics);
      mockGrowthRepo.save.mockImplementation(async (m) => m);

      const updated = await service.updateMetrics('u1', { stableDays: 7 });
      expect(mockGrowthRepo.create).toHaveBeenCalled();
    });
  });
});