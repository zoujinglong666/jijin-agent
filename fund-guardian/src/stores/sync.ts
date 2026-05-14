import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '../services/api'

export interface PlatformStatus {
  platform: string
  connected: boolean
  lastSync?: string
  syncCount?: number
  error?: string
}

export interface SyncHistoryItem {
  id: string
  platform: string
  status: 'success' | 'failed'
  timestamp: string
  details: string
}

export interface SyncSettings {
  autoSync: boolean
  syncInterval: number
  platforms: Record<string, any>
}

export const useSyncStore = defineStore('sync', () => {
  // 状态
  const platforms = ref<PlatformStatus[]>([])
  const syncHistory = ref<SyncHistoryItem[]>([])
  const settings = ref<SyncSettings>({
    autoSync: false,
    syncInterval: 24,
    platforms: {}
  })
  const loading = ref(false)

  // 获取支持的平台列表
  const getSupportedPlatforms = async (): Promise<string[]> => {
    try {
      const result = await request<{ platforms: string[] }>({ method: 'GET', url: '/api/sync/platforms' })
      return result.platforms || []
    } catch (error) {
      console.error('获取支持平台失败:', error)
      return []
    }
  }

  // 获取用户同步状态
  const getSyncStatus = async (): Promise<Record<string, any>> => {
    try {
      const result = await request<{ status: Record<string, any> }>({ method: 'GET', url: '/api/sync/status' })
      return result.status || {}
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {}
    }
  }

  // 连接平台
  const connectPlatform = async (platform: string, credentials: any): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean }>({ 
        method: 'POST', 
        url: '/api/sync/connect',
        data: { platform, credentials }
      })
      return result.success || false
    } catch (error) {
      console.error('连接平台失败:', error)
      throw error
    }
  }

  // 断开平台连接
  const disconnectPlatform = async (platform: string): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean }>({ 
        method: 'POST', 
        url: '/api/sync/disconnect', 
        data: { platform } 
      })
      return result.success || false
    } catch (error) {
      console.error('断开平台失败:', error)
      throw error
    }
  }

  // 同步用户数据
  const syncAllPlatforms = async (): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean }>({ 
        method: 'POST', 
        url: '/api/sync/sync' 
      })
      return result.success || false
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    }
  }

  // 设置自动同步
  const setAutoSync = async (enabled: boolean, interval?: number): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean }>({ 
        method: 'POST', 
        url: '/api/sync/sync/auto',
        data: { enabled, interval }
      })
      return result.success || false
    } catch (error) {
      console.error('设置自动同步失败:', error)
      throw error
    }
  }

  // 获取同步历史
  const getSyncHistory = async (limit: number = 10): Promise<SyncHistoryItem[]> => {
    try {
      const result = await request<{ history: SyncHistoryItem[] }>({ 
        method: 'GET', 
        url: `/api/sync/sync/history?limit=${limit}` 
      })
      return result.history || []
    } catch (error) {
      console.error('获取同步历史失败:', error)
      return []
    }
  }

  // 获取同步设置
  const getSyncSettings = async (): Promise<SyncSettings> => {
    try {
      const result = await request<{ settings: SyncSettings }>({ 
        method: 'GET', 
        url: '/api/sync/settings' 
      })
      return result.settings || {
        autoSync: false,
        syncInterval: 24,
        platforms: {}
      }
    } catch (error) {
      console.error('获取同步设置失败:', error)
      return {
        autoSync: false,
        syncInterval: 24,
        platforms: {}
      }
    }
  }

  // 更新同步设置
  const updateSyncSettings = async (settings: Partial<SyncSettings>): Promise<boolean> => {
    try {
      const result = await request<{ success: boolean }>({ 
        method: 'POST', 
        url: '/api/sync/settings',
        data: settings
      })
      return result.success || false
    } catch (error) {
      console.error('更新同步设置失败:', error)
      throw error
    }
  }

  // 加载所有状态
  const loadAllStatus = async () => {
    loading.value = true
    try {
      const [platformStatus, syncSettings, history] = await Promise.all([
        getSyncStatus(),
        getSyncSettings(),
        getSyncHistory()
      ])

      // 更新状态
      settings.value = syncSettings
      syncHistory.value = history

      // 根据平台状态更新平台列表
      const supportedPlatforms = await getSupportedPlatforms()
      platforms.value = supportedPlatforms.map(key => ({
        platform: key,
        connected: platformStatus[key]?.connected || false,
        lastSync: platformStatus[key]?.lastSync || undefined,
        syncCount: platformStatus[key]?.syncCount || 0,
        error: platformStatus[key]?.error || undefined
      }))
    } catch (error) {
      console.error('加载同步状态失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    platforms,
    syncHistory,
    settings,
    loading,

    // 方法
    getSupportedPlatforms,
    getSyncStatus,
    connectPlatform,
    disconnectPlatform,
    syncAllPlatforms,
    setAutoSync,
    getSyncHistory,
    getSyncSettings,
    updateSyncSettings,
    loadAllStatus
  }
})