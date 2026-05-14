import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SyncService, PlatformConnectionStatus } from './sync.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('数据同步')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('platforms')
  @ApiOperation({ summary: '获取支持的同步平台列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPlatforms() {
    const platforms = await this.syncService.getSupportedPlatforms();
    return { platforms };
  }

  @Get('status')
  @ApiOperation({ summary: '获取用户同步状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSyncStatus(@Req() req: any) {
    const userId = req.user.userId;
    const status = await this.syncService.getPlatformSyncStatus(userId);
    return { status };
  }

  @Post('connect')
  @ApiOperation({ summary: '连接平台' })
  @ApiResponse({ status: 200, description: '连接成功' })
  async connectPlatform(
    @Req() req: any,
    @Body('platform') platform: string,
    @Body('credentials') credentials: Record<string, any>,
  ) {
    const userId = req.user.userId;
    const result = await this.syncService.connectPlatform(userId, platform, credentials);
    return result;
  }

  @Post('disconnect')
  @ApiOperation({ summary: '断开平台连接' })
  @ApiResponse({ status: 200, description: '断开成功' })
  async disconnectPlatform(
    @Req() req: any,
    @Body('platform') platform: string,
  ) {
    const userId = req.user.userId;
    const result = await this.syncService.disconnectPlatform(userId, platform);
    return result;
  }

  @Post('sync')
  @ApiOperation({ summary: '手动同步数据' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncData(
    @Req() req: any,
    @Body('platform') platform?: string,
  ) {
    const userId = req.user.userId;
    if (platform) {
      const result = await this.syncService.syncPlatform(userId, platform);
      return result;
    } else {
      const result = await this.syncService.syncAllPlatforms(userId);
      return result;
    }
  }

  @Post('sync/auto')
  @ApiOperation({ summary: '设置自动同步' })
  @ApiResponse({ status: 200, description: '设置成功' })
  async setAutoSync(
    @Req() req: any,
    @Body('enabled') enabled: boolean,
    @Body('interval') interval?: number,
  ) {
    const userId = req.user.userId;
    const result = await this.syncService.updateSyncSettings(userId, { autoSync: enabled, frequency: 'daily' });
    return result;
  }

  @Get('sync/history')
  @ApiOperation({ summary: '获取同步历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSyncHistory(
    @Req() req: any,
    @Param('limit') limit?: number,
  ) {
    const userId = req.user.userId;
    // 返回简化版历史记录
    const status = await this.syncService.getPlatformSyncStatus(userId);
    const platforms = Object.keys(status);
    const history = platforms.map(platform => ({
      id: platform,
      platform,
      status: status[platform].connected ? 'success' : 'failed',
      timestamp: status[platform].lastSyncTime ? new Date(status[platform].lastSyncTime) : new Date(),
      details: status[platform].connected ? `同步了 ${status[platform].syncCount} 只基金` : '未连接',
    }));
    return { history };
  }

  @Get('settings')
  @ApiOperation({ summary: '获取同步设置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSyncSettings(@Req() req: any) {
    const userId = req.user.userId;
    const settings = await this.syncService.getSyncSettings(userId);
    return { settings };
  }

  @Post('settings')
  @ApiOperation({ summary: '更新同步设置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateSyncSettings(
    @Req() req: any,
    @Body() settings: Record<string, any>,
  ) {
    const userId = req.user.userId;
    const result = await this.syncService.updateSyncSettings(userId, settings);
    return { success: result };
  }
}