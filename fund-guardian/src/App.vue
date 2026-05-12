<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
  checkAuth()
})

function checkAuth() {
  const token = uni.getStorageSync('fg_auth_token')
  if (!token) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
}
</script>

<template>
  <xiaoji-assistant />
</template>

<style lang="scss">
page {
  background-color: #F8FAFC;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #1E293B;
  font-size: 28rpx;
  line-height: 1.6;
}

.container {
  padding: 24rpx 32rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 24rpx;
}

.text-secondary {
  color: #64748B;
}

.text-warning {
  color: #F59E0B;
}

.text-danger {
  color: #EF4444;
}

.text-safe {
  color: #22C55E;
}

.text-primary {
  color: #6B7FD7;
}
</style>
