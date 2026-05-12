import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() body: { email: string; password: string }) {
    this.authService.validatePasswordStrength(body.password);
    const result = await this.authService.register(body.email, body.password);
    return {
      user: { id: result.user.id, email: result.user.email, riskPreference: result.user.riskPreference },
      token: result.token,
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.authService.login(body.email, body.password);
    return {
      user: { id: result.user.id, email: result.user.email, riskPreference: result.user.riskPreference },
      token: result.token,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    const user = await this.authService.validateUser(req.user.userId);
    if (!user) {
      throw new BizException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    return {
      id: user.id,
      email: user.email,
      riskPreference: user.riskPreference,
      behaviorTrackingEnabled: user.behaviorTrackingEnabled,
      dailyReportEnabled: user.dailyReportEnabled,
      llmModel: user.llmModel,
    };
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Req() req: any, @Body() body: { riskPreference?: string; behaviorTrackingEnabled?: boolean; dailyReportEnabled?: boolean }) {
    const user = await this.authService.updateSettings(req.user.userId, body);
    return {
      id: user.id,
      email: user.email,
      riskPreference: user.riskPreference,
      behaviorTrackingEnabled: user.behaviorTrackingEnabled,
      dailyReportEnabled: user.dailyReportEnabled,
    };
  }
}