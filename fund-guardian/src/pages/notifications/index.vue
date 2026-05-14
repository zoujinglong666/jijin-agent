<template>
  <view class="notifications-page">
    <view v-if="notifications.length === 0" class="empty-state">
      <text class="empty-icon">🔔</text>
      <text class="empty-text">暂无通知</text>
      <text class="empty-hint">Agent检测到风险时会主动推送通知</text>
    </view>

    <view v-else class="notification-list">
      <view class="list-header">
        <text class="list-count">{{ notifications.length }} 条通知</text>
        <text v-if="unreadCount > 0" class="mark-all" @click="handleMarkAllRead">全部已读</text>
      </view>

      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-item"
        :class="{ unread: !item.read }"
        @click="handleRead(item)"
      >
        <view class="item-dot" :class="item.level || 'info'" />
        <view class="item-content">
          <view class="item-header">
            <text class="item-type">{{ typeLabel(item.type) }}</text>
            <text class="item-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <text class="item-title">{{ item.title }}</text>
          <text class="item-desc">{{ item.content }}</text>
          <view v-if="item.sector" class="item-sector">
            <text class="sector-tag">{{ item.sector }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { notificationApi } from '@/services/api'
import type { NotificationItem } from '@/services/api'

const notifications = ref<NotificationItem[]>([])
const unreadCount = ref(0)

onShow(async () => {
  await loadNotifications()
})

async function loadNotifications() {
  try {
    const [listRes, countRes] = await Promise.all([
      notificationApi.getList(50),
      notificationApi.getUnreadCount(),
    ])
    notifications.value = listRes.list || []
    unreadCount.value = countRes.count || 0
  } catch {
    notifications.value = []
  }
}

async function handleRead(item: NotificationItem) {
  if (!item.read) {
    try {
      await notificationApi.markRead(item.id)
      item.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {}
  }
}

async function handleMarkAllRead() {
  try {
    await notificationApi.markAllRead()
    notifications.value.forEach(n => { n.read = true })
    unreadCount.value = 0
    uni.showToast({ title: '已全部标记为已读', icon: 'success' })
  } catch {}
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    agent_alert: 'Agent预警',
    behavior_alert: '行为预警',
    market_alert: '市场事件',
    risk_alert: '风险预警',
  }
  return map[type] || '通知'
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.notifications-page {
  min-height: 100vh;
  background-color: #F8FAFC;
  padding: 24rpx 32rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
  gap: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #64748B;
  font-weight: 500;
}

.empty-hint {
  font-size: 26rpx;
  color: #94A3B8;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.list-count {
  font-size: 26rpx;
  color: #94A3B8;
}

.mark-all {
  font-size: 26rpx;
  color: #6B7FD7;
}

.notification-item {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);

  &.unread {
    border-left: 6rpx solid #6B7FD7;
  }
}

.item-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;

  &.high { background-color: #EF4444; }
  &.medium { background-color: #F59E0B; }
  &.low, &.info { background-color: #94A3B8; }
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-type {
  font-size: 22rpx;
  color: #6B7FD7;
  background: #EEF2FF;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.item-time {
  font-size: 22rpx;
  color: #94A3B8;
}

.item-title {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
  line-height: 1.4;
}

.item-desc {
  font-size: 26rpx;
  color: #64748B;
  line-height: 1.5;
}

.item-sector {
  margin-top: 4rpx;
}

.sector-tag {
  font-size: 22rpx;
  color: #64748B;
  background: #F1F5F9;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
</style>
