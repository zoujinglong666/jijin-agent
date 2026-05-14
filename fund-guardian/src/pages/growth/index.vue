<template>
  <view class="growth-page">
    <view class="header-section">
      <view class="header-card">
        <view class="growth-score">
          <text class="score-label">投资成长指数</text>
          <text class="score-value">{{ growthScore }}</text>
          <text class="score-desc">{{ growthLevel }}</text>
        </view>
        <view class="growth-chart">
          <view class="chart-placeholder">
            <text class="chart-text">成长趋势图</text>
          </view>
        </view>
      </view>
    </view>

    <view class="metrics-section">
      <view class="section-header">
        <CarbonIcon name="analytics" size="16" color="#6B7FD7" />
        <text class="section-title">成长指标</text>
      </view>

      <view class="metrics-grid">
        <view class="metric-card">
          <view class="metric-icon">
            <CarbonIcon name="trophy" size="20" color="#8B9DC3" />
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ totalActions }}</text>
            <text class="metric-label">投资操作</text>
          </view>
        </view>
        <view class="metric-card">
          <view class="metric-icon">
            <CarbonIcon name="checkmark" size="20" color="#8B9DC3" />
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ goodActions }}</text>
            <text class="metric-label">良好决策</text>
          </view>
        </view>
        <view class="metric-card">
          <view class="metric-icon">
            <CarbonIcon name="trending-down" size="20" color="#C4A882" />
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ improvementRate }}%</text>
            <text class="metric-label">改进率</text>
          </view>
        </view>
        <view class="metric-card">
          <view class="metric-icon">
            <CarbonIcon name="timer" size="20" color="#8B9DC3" />
          </view>
          <view class="metric-content">
            <text class="metric-value">{{ holdingDays }}天</text>
            <text class="metric-label">平均持有</text>
          </view>
        </view>
      </view>
    </view>

    <view class="achievements-section">
      <view class="section-header">
        <CarbonIcon name="medal" size="16" color="#6B7FD7" />
        <text class="section-title">成长成就</text>
      </view>

      <view v-if="achievements.length === 0" class="empty-section">
        <text class="empty-text">暂无成就，继续投资学习吧</text>
      </view>
      <view v-else class="achievements-list">
        <view
          v-for="achievement in achievements"
          :key="achievement.id"
          class="achievement-card"
        >
          <view class="achievement-icon">
            <CarbonIcon :name="achievement.icon" size="24" color="#FFFFFF" />
          </view>
          <view class="achievement-content">
            <text class="achievement-title">{{ achievement.title }}</text>
            <text class="achievement-desc">{{ achievement.description }}</text>
            <text class="achievement-date">{{ formatDate(achievement.achievedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="learning-section">
      <view class="section-header">
        <CarbonIcon name="education" size="16" color="#6B7FD7" />
        <text class="section-title">学习建议</text>
      </view>

      <view class="learning-cards">
        <view v-for="tip in learningTips" :key="tip.id" class="learning-card">
          <view class="learning-header">
            <CarbonIcon :name="tip.icon" size="16" color="#6B7FD7" />
            <text class="learning-title">{{ tip.title }}</text>
          </view>
          <text class="learning-content">{{ tip.content }}</text>
          <view class="learning-progress" v-if="tip.progress">
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: tip.progress + '%' }"></view>
            </view>
            <text class="progress-text">{{ tip.progress }}%</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFundStore } from '@/store'
import { growthApi } from '@/services/api'

const fundStore = useFundStore()

const growthScore = ref(65)
const totalActions = ref(0)
const goodActions = ref(0)
const improvementRate = ref(0)
const holdingDays = ref(0)
const achievements = ref<any[]>([])
const learningTips = ref<any[]>([])

const growthLevel = computed(() => {
  if (growthScore.value >= 90) return '投资大师'
  if (growthScore.value >= 80) return '资深投资者'
  if (growthScore.value >= 70) return '进阶投资者'
  if (growthScore.value >= 60) return '成长投资者'
  return '新手投资者'
})

onMounted(async () => {
  try {
    const result = await growthApi.getGrowthData() as any
    growthScore.value = result?.score || 65
    totalActions.value = result?.totalActions || 0
    goodActions.value = result?.goodActions || 0
    improvementRate.value = result?.improvementRate || 0
    holdingDays.value = result?.avgHoldingDays || 0
    achievements.value = result?.achievements || []
    learningTips.value = result?.learningTips || []
  } catch (e) {
    console.error('loadGrowthData failed:', e)
  }
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.growth-page {
  min-height: 100vh;
  background: #F8FAFC;
  padding-bottom: 60rpx;
}

.header-section {
  padding: 32rpx 32rpx 16rpx;
}

.header-card {
  background: linear-gradient(135deg, #6B7FD7 0%, #8B9DC3 100%);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.growth-score {
  flex: 1;
}

.score-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 8rpx;
}

.score-value {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8rpx;
}

.score-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  display: inline-block;
}

.growth-chart {
  width: 160rpx;
  height: 160rpx;
  margin-left: 32rpx;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  transform: rotate(-45deg);
}

.metrics-section {
  padding: 0 32rpx 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  padding-left: 4rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1E293B;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.metric-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.metric-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
  display: block;
  margin-bottom: 4rpx;
}

.metric-label {
  font-size: 24rpx;
  color: #94A3B8;
}

.achievements-section {
  padding: 0 32rpx 24rpx;
}

.empty-section {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #94A3B8;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.achievement-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: flex-start;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.achievement-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #8B9DC3 0%, #6B7FD7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.achievement-content {
  flex: 1;
}

.achievement-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1E293B;
  display: block;
  margin-bottom: 6rpx;
}

.achievement-desc {
  font-size: 24rpx;
  color: #94A3B8;
  display: block;
  margin-bottom: 8rpx;
}

.achievement-date {
  font-size: 22rpx;
  color: #CBD5E1;
}

.learning-section {
  padding: 0 32rpx;
}

.learning-cards {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.learning-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.learning-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.learning-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1E293B;
}

.learning-content {
  font-size: 24rpx;
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.learning-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.progress-bar {
  flex: 1;
  height: 8rpx;
  background: #F1F5F9;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B9DC3 0%, #6B7FD7 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 22rpx;
  color: #8B9DC3;
  min-width: 40rpx;
  text-align: right;
}
</style>