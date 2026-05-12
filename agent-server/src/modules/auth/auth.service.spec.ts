import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../../database/entities/user.entity';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  describe('validatePasswordStrength', () => {
    it('should reject password shorter than 8 characters', () => {
      expect(() => service.validatePasswordStrength('Ab1')).toThrow(
        new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码长度至少8位'),
      );
    });

    it('should reject password without letters', () => {
      expect(() => service.validatePasswordStrength('12345678')).toThrow(
        new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码必须包含字母和数字'),
      );
    });

    it('should reject password without numbers', () => {
      expect(() => service.validatePasswordStrength('abcdefgh')).toThrow(
        new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码必须包含字母和数字'),
      );
    });

    it('should reject common passwords', () => {
      expect(() => service.validatePasswordStrength('abc12345')).toThrow(
        new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码过于简单，请使用更复杂的密码'),
      );
    });

    it('should accept a strong password', () => {
      expect(() => service.validatePasswordStrength('MyStr0ngP@ss')).not.toThrow();
    });

    it('should reject empty password', () => {
      expect(() => service.validatePasswordStrength('')).toThrow();
    });

    it('should reject password over 128 characters', () => {
      const longPw = 'A1' + 'b'.repeat(127);
      expect(() => service.validatePasswordStrength(longPw)).toThrow();
    });
  });

  describe('register', () => {
    it('should reject invalid email', async () => {
      await expect(service.register('invalid-email', 'test1234')).rejects.toThrow(BizException);
    });

    it('should reject duplicate email', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(service.register('test@test.com', 'test1234')).rejects.toThrow(
        new BizException(ErrorCode.EMAIL_EXISTS, '该邮箱已注册'),
      );
    });

    it('should register a new user and return token', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const mockUser = { id: 'uuid-1', email: 'test@test.com', riskPreference: 'balanced' };
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.register('test@test.com', 'test1234');
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock-jwt-token');
    });
  });

  describe('login', () => {
    it('should throw if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.login('test@test.com', 'test1234')).rejects.toThrow(BizException);
    });

    it('should throw if password is wrong', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: '1', email: 'test@test.com', password: '$2a$12$hashed', isActive: true,
      });
      // bcrypt.compare will fail with invalid hash
      await expect(service.login('test@test.com', 'wrongpassword')).rejects.toThrow(BizException);
    });

    it('should throw if account is disabled', async () => {
      const user = { id: '1', email: 'test@test.com', password: '', isActive: false };
      mockUserRepository.findOne.mockResolvedValue(user);
      await expect(service.login('test@test.com', 'test1234')).rejects.toThrow(BizException);
    });
  });

  describe('validateUser', () => {
    it('should return user if active', async () => {
      const mockUser = { id: '1', isActive: true };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUser('1');
      expect(result).toEqual(mockUser);
    });

    it('should return null if not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update and return user', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      const updated = { id: '1', riskPreference: 'aggressive' };
      mockUserRepository.findOne.mockResolvedValue(updated);
      const result = await service.updateSettings('1', { riskPreference: 'aggressive' });
      expect(result).toEqual(updated);
    });

    it('should throw if user not found after update', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 0 });
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.updateSettings('nonexistent', {})).rejects.toThrow(BizException);
    });
  });
});