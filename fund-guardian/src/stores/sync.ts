import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '../utils/http'

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
      const response = await http.get('/api/sync/platforms')
      return response.data.platforms || []
    } catch (error) {
      console.error('获取支持平台失败:', error)
      return []
    }
  }

  // 获取用户同步状态
  const getSyncStatus = async (): Promise<Record<string, any>> => {
    try {
      const response = await http.get('/api/sync/status')
      return response.data.status || {}
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {}
    }
  }

  // 连接平台
  const connectPlatform = async (platform: string, credentials: any): Promise<boolean> => {
    try {
      const response = await http.post('/api/sync/connect', {
        platform,
        credentials
      })
      return response.data.success || false
    } catch (error) {
      console.error('连接平台失败:', error)
      throw error
    }
  }

  // 断开平台连接
  const disconnectPlatform = async (platform: string): Promise<boolean> => {
    try {
      const response = await http.post('/api/sync/disconnect', { platform })
      return response.data.success || false
    } catch (error) {
      console.error('断开平台失败:', error)
      throw error
    }
  }

  // 同步用户数据
  const syncAllPlatforms = async (): Promise<boolean> => {
    try {
      const response = await http.post('/api/sync/sync')
      return response.data.success || false
    } catch (error) {
      console.error('同步失败:', error)
      throw error
    }
  }

  // 设置自动同步
  const setAutoSync = async (enabled: boolean, interval?: number): Promise<boolean> => {
    try {
      const response = await http.post('/api/sync/sync/auto', {
        enabled,
        interval
      })
      return response.data.success || false
    } catch (error) {
      console.error('设置自动同步失败:', error)
      throw error
    }
  }

  // 获取同步历史
  const getSyncHistory = async (limit: number = 10): Promise<SyncHistoryItem[]> => {
    try {
      const response = await http.get(`/api/sync/sync/history?limit=${limit}`)
      return response.data.history || []
    } catch (error) {
      console.error('获取同步历史失败:', error)
      return []
    }
  }

  // 获取同步设置
  const getSyncSettings = async (): Promise<SyncSettings> => {
    try {
      const response = await http.get('/api/sync/settings')
      return response.data.settings || {
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
      const response = await http.post('/api/sync/settings', settings)
      return response.data.success || false
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