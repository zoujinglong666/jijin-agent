import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationService, BehaviorIntervention } from './notification.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('通知提醒')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('interventions')
  @ApiOperation({ summary: '获取行为干预提醒' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getBehaviorInterventions(@Req() req: any) {
    const userId = req.user.userId;
    const interventions = await this.notificationService.getUserInterventions(userId);
    return { interventions };
  }

  @Post('interventions/check')
  @ApiOperation({ summary: '检查行为干预' })
  @ApiResponse({ status: 200, description: '检查完成' })
  async checkBehaviorInterventions(@Req() req: any) {
    const userId = req.user.userId;
    const interventions = await this.notificationService.detectIrrationalBehavior(userId);
    return { interventions };
  }

  @Post('interventions/:id/mark-read')
  @ApiOperation({ summary: '标记行为干预为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markInterventionRead(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    const result = await this.notificationService.markInterventionAsRead(userId, id);
    return { success: result };
  }

  @Post('interventions/:id/ignore')
  @ApiOperation({ summary: '忽略行为干预' })
  @ApiResponse({ status: 200, description: '忽略成功' })
  async ignoreIntervention(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user.userId;
    const result = await this.notificationService.dismissIntervention(userId, id);
    return { success: result };
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: '获取月度行为报告' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMonthlyReport(
    @Req() req: any,
    @Param('date') date?: string,
  ) {
    const userId = req.user.userId;
    const report = await this.notificationService.generateMonthlyReport(userId, date);
    return { report };
  }

  @Post('reports/generate')
  @ApiOperation({ summary: '生成月度行为报告' })
  @ApiResponse({ status: 200, description: '生成成功' })
  async generateMonthlyReport(
    @Req() req: any,
    @Body('month') month?: string,
  ) {
    const userId = req.user.userId;
    const report = await this.notificationService.generateMonthlyReport(userId, month);
    return { report };
  }

  @Get('reports/history')
  @ApiOperation({ summary: '获取历史报告列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getReportHistory(@Req() req: any) {
    const userId = req.user.userId;
    const reports = await this.notificationService.getUserReports(userId);
    return { reports };
  }
}