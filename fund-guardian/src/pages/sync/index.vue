<template>
  <view class="sync-page">
    <view class="header">
      <text class="title">数据同步管理</text>
      <text class="subtitle">管理您的基金持仓数据同步设置</text>
    </view>

    <view class="section">
      <text class="section-title">支持的同步平台</text>
      <view class="platform-list">
        <view 
          v-for="platform in platforms" 
          :key="platform.key" 
          class="platform-card"
        >
          <view class="platform-header">
            <image :src="platform.icon" class="platform-icon" />
            <view class="platform-info">
              <text class="platform-name">{{ platform.name }}</text>
              <text class="platform-desc">{{ platform.description }}</text>
            </view>
            <button 
              v-if="!platform.connected" 
              @click="connectPlatform(platform.key)"
              class="connect-btn"
            >
              连接
            </button>
            <view v-else class="connected-status">
              <text class="connected-text">已连接</text>
              <button @click="disconnectPlatform(platform.key)" class="disconnect-btn">
                断开
              </button>
            </view>
          </view>
          
          <view v-if="platform.lastSync" class="sync-info">
            <text class="last-sync">上次同步: {{ formatTime(platform.lastSync) }}</text>
            <text class="sync-count">已同步 {{ platform.syncCount }} 只基金</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">同步设置</text>
      <view class="settings-card">
        <view class="setting-item">
          <view class="setting-info">
            <text class="setting-title">自动同步</text>
            <text class="setting-desc">定期自动同步您的基金持仓数据</text>
          </view>
          <switch 
            :checked="autoSync" 
            @change="toggleAutoSync"
            class="sync-switch"
          />
        </view>
        
        <view class="setting-item" v-if="autoSync">
          <view class="setting-info">
            <text class="setting-title">同步频率</text>
            <text class="setting-desc">设置自动同步的时间间隔</text>
          </view>
          <picker 
            :value="syncFrequencyIndex" 
            :range="frequencyOptions" 
            @change="onFrequencyChange"
            class="frequency-picker"
          >
            <view class="picker-text">{{ frequencyOptions[syncFrequencyIndex] }}</view>
          </picker>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">同步历史</text>
      <view class="history-list">
        <view 
          v-for="item in syncHistory" 
          :key="item.id" 
          class="history-item"
        >
          <view class="history-header">
            <text class="platform-name">{{ getPlatformName(item.platform) }}</text>
            <text :class="['status', item.status]">
              {{ item.status === 'success' ? '成功' : '失败' }}
            </text>
          </view>
          <text class="history-time">{{ formatTime(item.timestamp) }}</text>
          <text class="history-details">{{ item.details }}</text>
        </view>
      </view>
    </view>

    <view class="manual-sync-section">
      <button @click="manualSync" class="manual-sync-btn">
        立即同步所有平台
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSyncStore } from '../../stores/sync'

const syncStore = useSyncStore()

// 状态
const platforms = ref([
  {
    key: 'alipay',
    name: '支付宝',
    description: '蚂蚁财富基金',
    icon: '/static/icons/alipay.png',
    connected: false,
    lastSync: null,
    syncCount: 0
  },
  {
    key: 'tiantian',
    name: '天天基金',
    description: '东方财富旗下基金平台',
    icon: '/static/icons/tiantian.png',
    connected: false,
    lastSync: null,
    syncCount: 0
  },
  {
    key: 'licaitong',
    name: '腾讯理财通',
    description: '微信理财通基金',
    icon: '/static/icons/licaitong.png',
    connected: false,
    lastSync: null,
    syncCount: 0
  },
  {
    key: 'eastmoney',
    name: '东方财富',
    description: '东方财富网基金',
    icon: '/static/icons/eastmoney.png',
    connected: false,
    lastSync: null,
    syncCount: 0
  }
])

const autoSync = ref(false)
const syncFrequencyIndex = ref(0)
const frequencyOptions = ['每天', '每3天', '每周']
const syncHistory = ref([])

// 获取平台名称
const getPlatformName = (key: string) => {
  const platform = platforms.value.find(p => p.key === key)
  return platform ? platform.name : key
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

// 连接平台
const connectPlatform = async (platform: string) => {
  try {
    // 这里应该打开连接模态框或跳转到认证页面
    uni.showModal({
      title: '连接平台',
      content: `即将连接 ${getPlatformName(platform)}，请确认`,
      success: async (res) => {
        if (res.confirm) {
          await syncStore.connectPlatform(platform, {})
          await loadSyncStatus()
          uni.showToast({
            title: '连接成功',
            icon: 'success'
          })
        }
      }
    })
  } catch (error) {
    uni.showToast({
      title: '连接失败',
      icon: 'error'
    })
  }
}

// 断开平台
const disconnectPlatform = async (platform: string) => {
  try {
    uni.showModal({
      title: '断开连接',
      content: `确定要断开 ${getPlatformName(platform)} 的连接吗？`,
      success: async (res) => {
        if (res.confirm) {
          await syncStore.disconnectPlatform(platform)
          await loadSyncStatus()
          uni.showToast({
            title: '断开成功',
            icon: 'success'
          })
        }
      }
    })
  } catch (error) {
    uni.showToast({
      title: '断开失败',
      icon: 'error'
    })
  }
}

// 切换自动同步
const toggleAutoSync = async (e: any) => {
  const enabled = e.detail.value
  try {
    await syncStore.setAutoSync(enabled)
    autoSync.value = enabled
    uni.showToast({
      title: enabled ? '已开启自动同步' : '已关闭自动同步',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '设置失败',
      icon: 'error'
    })
  }
}

// 更改同步频率
const onFrequencyChange = (e: any) => {
  syncFrequencyIndex.value = e.detail.value
}

// 手动同步
const manualSync = async () => {
  uni.showLoading({ title: '同步中...' })
  try {
    await syncStore.syncAllPlatforms()
    await loadSyncStatus()
    uni.hideLoading()
    uni.showToast({
      title: '同步完成',
      icon: 'success'
    })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '同步失败',
      icon: 'error'
    })
  }
}

// 加载同步状态
const loadSyncStatus = async () => {
  try {
    const status = await syncStore.getSyncStatus()
    const settings = await syncStore.getSyncSettings()
    
    // 更新平台连接状态
    platforms.value.forEach(platform => {
      if (status[platform.key]) {
        platform.connected = status[platform.key].connected
        platform.lastSync = status[platform.key].lastSyncTime
        platform.syncCount = status[platform.key].syncCount
      }
    })
    
    // 更新设置
    autoSync.value = settings.autoSync
    const frequencyIndex = frequencyOptions.indexOf(settings.frequency || '每天')
    syncFrequencyIndex.value = frequencyIndex >= 0 ? frequencyIndex : 0
    
    // 加载历史记录
    syncHistory.value = await syncStore.getSyncHistory(10)
  } catch (error) {
    console.error('加载同步状态失败:', error)
  }
}

// 页面加载时初始化
onMounted(() => {
  loadSyncStatus()
})
</script>

<style scoped>
.sync-page {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.header {
  margin-bottom: 24px;
}

.title {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  display: block;
  font-size: 14px;
  color: #666;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
}

.platform-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.platform-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.platform-info {
  flex: 1;
}

.platform-name {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.platform-desc {
  display: block;
  font-size: 12px;
  color: #666;
}

.connect-btn {
  background: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
}

.connected-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connected-text {
  font-size: 12px;
  color: #34c759;
}

.disconnect-btn {
  background: #ff3b30;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 10px;
}

.sync-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.last-sync, .sync-count {
  display: block;
  font-size: 12px;
  color: #666;
}

.settings-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.setting-info {
  flex: 1;
}

.setting-title {
  display: block;
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #666;
}

.frequency-picker {
  text-align: right;
}

.picker-text {
  font-size: 14px;
  color: #007aff;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.platform-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.status.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.failed {
  background: #ffebee;
  color: #c62828;
}

.history-time {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.history-details {
  font-size: 12px;
  color: #666;
}

.manual-sync-section {
  margin-top: 24px;
}

.manual-sync-btn {
  width: 100%;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
  font-weight: bold;
}
</style>