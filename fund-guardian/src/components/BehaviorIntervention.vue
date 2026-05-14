<template>
  <view class="behavior-intervention">
    <view class="header">
      <text class="title">行为提醒</text>
      <view class="header-actions">
        <button @click="checkInterventions" class="check-btn">
          检测
        </button>
        <view class="unread-badge" v-if="unreadCount > 0">
          {{ unreadCount }}
        </view>
      </view>
    </view>

    <view class="intervention-list">
      <view 
        v-for="intervention in interventions" 
        :key="intervention.id" 
        class="intervention-card"
        :class="{ 'unread': !intervention.isRead && !intervention.isIgnored }"
      >
        <view class="intervention-header">
          <view class="type-badge" :class="intervention.type">
            {{ getTypeLabel(intervention.type) }}
          </view>
          <view class="severity-badge" :class="intervention.severity">
            {{ getSeverityLabel(intervention.severity) }}
          </view>
        </view>

        <view class="intervention-content">
          <text class="intervention-title">{{ intervention.title }}</text>
          <text class="intervention-description">{{ intervention.description }}</text>
          
          <view v-if="intervention.fundName" class="fund-info">
            <text class="fund-label">相关基金:</text>
            <text class="fund-name">{{ intervention.fundName }}</text>
          </view>
          
          <view v-if="intervention.suggestion" class="suggestion">
            <text class="suggestion-label">建议:</text>
            <text class="suggestion-text">{{ intervention.suggestion }}</text>
          </view>
        </view>

        <view class="intervention-actions">
          <button 
            v-if="!intervention.isRead" 
            @click="markAsRead(intervention.id)"
            class="action-btn read-btn"
          >
            已读
          </button>
          <button 
            @click="ignoreIntervention(intervention.id)"
            class="action-btn ignore-btn"
          >
            忽略
          </button>
        </view>

        <view class="intervention-time">
          {{ formatTime(intervention.createdAt) }}
        </view>
      </view>

      <view v-if="interventions.length === 0" class="empty-state">
        <text class="empty-text">暂无行为提醒</text>
        <text class="empty-subtext">系统正在监控您的投资行为，发现异常时会及时提醒</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useNotificationStore } from '../stores/notification'

const notificationStore = useNotificationStore()

// 计算属性
const interventions = computed(() => notificationStore.interventions)
const unreadCount = computed(() => notificationStore.unreadCount)

// 获取类型标签
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'panic': '恐慌',
    'frequent_check': '频繁查看',
    'chase_rise': '追涨杀跌',
    'frequent_trade': '频繁交易',
    'concentration_risk': '集中风险'
  }
  return labels[type] || type
}

// 获取严重性标签
const getSeverityLabel = (severity: string): string => {
  const labels: Record<string, string> = {
    'low': '轻微',
    'medium': '中等',
    'high': '严重'
  }
  return labels[severity] || severity
}

// 格式化时间
const formatTime = (time: string): string => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  
  // 显示具体日期
  return date.toLocaleDateString('zh-CN')
}

// 标记为已读
const markAsRead = async (id: string) => {
  try {
    await notificationStore.markInterventionRead(id)
  } catch (error) {
    console.error('标记已读失败:', error)
  }
}

// 忽略干预
const ignoreIntervention = async (id: string) => {
  try {
    await notificationStore.ignoreIntervention(id)
  } catch (error) {
    console.error('忽略干预失败:', error)
  }
}

// 手动检测干预
const checkInterventions = async () => {
  try {
    uni.showLoading({ title: '检测中...' })
    await notificationStore.checkBehaviorInterventions()
    uni.hideLoading()
    uni.showToast({
      title: '检测完成',
      icon: 'success'
    })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: '检测失败',
      icon: 'error'
    })
  }
}

// 页面加载时初始化
onMounted(() => {
  notificationStore.getBehaviorInterventions()
})
</script>

<style scoped>
.behavior-intervention {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-btn {
  background: #007aff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

.unread-badge {
  background: #ff3b30;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.intervention-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intervention-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  border-left: 4px solid #007aff;
}

.intervention-card.unread {
  background: #e3f2fd;
  border-left-color: #ff9800;
}

.intervention-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.type-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.type-badge.panic {
  background: #ff3b30;
}

.type-badge.frequent_check {
  background: #ff9500;
}

.type-badge.chase_rise {
  background: #ff2d55;
}

.type-badge.frequent_trade {
  background: #af52de;
}

.type-badge.concentration_risk {
  background: #5856d6;
}

.severity-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.severity-badge.low {
  background: #34c759;
}

.severity-badge.medium {
  background: #ff9500;
}

.severity-badge.high {
  background: #ff3b30;
}

.intervention-content {
  margin-bottom: 8px;
}

.intervention-title {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.intervention-description {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.fund-info {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.fund-label {
  font-size: 12px;
  color: #999;
}

.fund-name {
  font-size: 12px;
  color: #007aff;
}

.suggestion {
  display: flex;
  gap: 4px;
}

.suggestion-label {
  font-size: 12px;
  color: #999;
}

.suggestion-text {
  font-size: 12px;
  color: #34c759;
  font-weight: bold;
}

.intervention-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.action-btn {
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 10px;
}

.read-btn {
  background: #34c759;
  color: white;
}

.ignore-btn {
  background: #8e8e93;
  color: white;
}

.intervention-time {
  font-size: 10px;
  color: #999;
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 32px 16px;
}

.empty-text {
  display: block;
  font-size: 16px;
  color: #666;
  margin-bottom: 8px;
}

.empty-subtext {
  display: block;
  font-size: 12px;
  color: #999;
}
</style>