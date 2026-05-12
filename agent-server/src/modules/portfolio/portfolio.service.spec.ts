import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { Fund } from '../../database/entities/fund.entity';
import { ActionRecord } from '../../database/entities/action-record.entity';

describe('PortfolioService', () => {
  let service: PortfolioService;

  const mockFundRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  const mockActionRepo = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: getRepositoryToken(Fund), useValue: mockFundRepo },
        { provide: getRepositoryToken(ActionRecord), useValue: mockActionRepo },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
  });

  describe('getFunds', () => {
    it('should return funds for a user', async () => {
      const mockFunds = [
        { id: '1', userId: 'u1', name: '基金A', code: '001', sector: '半导体', amount: 1000 },
      ];
      mockFundRepo.find.mockResolvedValue(mockFunds);
      const result = await service.getFunds('u1');
      expect(result).toEqual(mockFunds);
      expect(mockFundRepo.find).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('should return empty array when no funds', async () => {
      mockFundRepo.find.mockResolvedValue([]);
      const result = await service.getFunds('u1');
      expect(result).toEqual([]);
    });
  });

  describe('addFund', () => {
    it('should create and save a fund', async () => {
      const fundData = { name: '基金A', code: '001', sector: '半导体', amount: 1000, profitRate: 0.05, userId: 'u1' };
      mockFundRepo.create.mockReturnValue(fundData);
      mockFundRepo.save.mockResolvedValue({ ...fundData, id: 'f1' });
      const result = await service.addFund('u1', fundData as any);
      expect(result.id).toBe('f1');
      expect(mockFundRepo.create).toHaveBeenCalledWith({ ...fundData, userId: 'u1' });
    });
  });

  describe('updateFund', () => {
    it('should update an existing fund', async () => {
      const existing = { id: 'f1', userId: 'u1', name: '基金A', amount: 1000 };
      mockFundRepo.findOne.mockResolvedValue(existing);
      mockFundRepo.save.mockResolvedValue({ ...existing, amount: 2000 });
      const result = await service.updateFund('u1', 'f1', { amount: 2000 } as any);
      expect(result.amount).toBe(2000);
    });

    it('should return null if fund not found', async () => {
      mockFundRepo.findOne.mockResolvedValue(null);
      const result = await service.updateFund('u1', 'nonexistent', {} as any);
      expect(result).toBeNull();
    });
  });

  describe('deleteFund', () => {
    it('should return true when fund deleted', async () => {
      mockFundRepo.delete.mockResolvedValue({ affected: 1 });
      const result = await service.deleteFund('u1', 'f1');
      expect(result).toBe(true);
    });

    it('should return false when fund not found', async () => {
      mockFundRepo.delete.mockResolvedValue({ affected: 0 });
      const result = await service.deleteFund('u1', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getSectorRatios', () => {
    it('should calculate sector ratios correctly', async () => {
      const funds = [
        { userId: 'u1', sector: '半导体', amount: 6000 },
        { userId: 'u1', sector: '消费', amount: 4000 },
      ];
      mockFundRepo.find.mockResolvedValue(funds);
      const result = await service.getSectorRatios('u1');
      expect(result['半导体'].ratio).toBeCloseTo(0.6);
      expect(result['消费'].ratio).toBeCloseTo(0.4);
    });

    it('should return empty object when no funds', async () => {
      mockFundRepo.find.mockResolvedValue([]);
      const result = await service.getSectorRatios('u1');
      expect(result).toEqual({});
    });
  });

  describe('getHighVolatilityRatio', () => {
    it('should calculate high volatility ratio', async () => {
      const funds = [
        { userId: 'u1', sector: '半导体', amount: 7000 },
        { userId: 'u1', sector: '债券', amount: 3000 },
      ];
      mockFundRepo.find.mockResolvedValue(funds);
      const result = await service.getHighVolatilityRatio('u1');
      expect(result).toBeCloseTo(0.7);
    });

    it('should return 0 when total is 0', async () => {
      mockFundRepo.find.mockResolvedValue([]);
      const result = await service.getHighVolatilityRatio('u1');
      expect(result).toBe(0);
    });
  });

  describe('addAction', () => {
    it('should create and save an action record', async () => {
      const action = { fundId: 'f1', actionType: 'reduce', ratio: 0.3, reason: 'test' };
      mockActionRepo.create.mockReturnValue({ ...action, userId: 'u1' });
      mockActionRepo.save.mockResolvedValue({ ...action, userId: 'u1', id: 1 });
      const result = await service.addAction('u1', action);
      expect(result.id).toBe(1);
    });
  });

  describe('importFunds', () => {
    it('should import multiple funds', async () => {
      const funds = [
        { name: 'A', code: '001', sector: '半导体', amount: 1000, profitRate: 0 },
      ];
      mockFundRepo.create.mockReturnValue({ ...funds[0], userId: 'u1' });
      mockFundRepo.save.mockResolvedValue([{ ...funds[0], userId: 'u1', id: 'f1' }]);
      const result = await service.importFunds('u1', funds as any);
      expect(result.length).toBe(1);
    });
  });
});