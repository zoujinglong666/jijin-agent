import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  validatePasswordStrength(password: string): void {
    if (!password || password.length < 8) {
      throw new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码长度至少8位');
    }
    if (password.length > 128) {
      throw new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码长度不能超过128位');
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasLetter || !hasNumber) {
      throw new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码必须包含字母和数字');
    }
    const commonPasswords = [
      '12345678', 'password', '123456789', '1234567890',
      'qwerty123', 'abc12345', '11111111', '00000000',
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码过于简单，请使用更复杂的密码');
    }
  }

  async register(email: string, password: string, riskPreference?: string): Promise<{ user: User; token: string }> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BizException(ErrorCode.INVALID_EMAIL, '请输入有效的邮箱地址');
    }

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BizException(ErrorCode.EMAIL_EXISTS, '该邮箱已注册');
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      riskPreference: riskPreference || 'balanced',
    });
    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BizException(ErrorCode.LOGIN_FAILED, '邮箱或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BizException(ErrorCode.LOGIN_FAILED, '邮箱或密码错误');
    }

    if (!user.isActive) {
      throw new BizException(ErrorCode.ACCOUNT_DISABLED, '账户已被禁用');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId, isActive: true } });
  }

  async updateRiskPreference(userId: string, preference: string): Promise<User> {
    await this.userRepository.update(userId, { riskPreference: preference });
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BizException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    return user;
  }

  async updateSettings(userId: string, updates: Partial<User>): Promise<User> {
    await this.userRepository.update(userId, updates);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BizException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    return user;
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}