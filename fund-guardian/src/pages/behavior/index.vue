<template>
  <view class="container">
    <view
      class="personality-card"
      :class="`personality-${personality?.type || 'balanced'}`"
    >
      <view class="personality-header">
        <view class="personality-label">{{ personality?.label || '加载中...' }}</view>
        <wd-tag
          :type="personalityScoreType"
          round
          size="small"
        >
          {{ personality?.score ?? '-' }}分
        </wd-tag>
      </view>
      <view class="personality-desc">{{ personality?.description || '' }}</view>
      <view class="personality-traits">
        <view
          v-for="(trait, idx) in (personality?.traits || [])"
          :key="idx"
          class="trait-item"
        >
          <view class="trait-dot" />
          <text class="trait-text">{{ trait }}</text>
        </view>
      </view>
    </view>

    <view class="section-header">
      <text class="section-title">行为标签</text>
    </view>
    <view class="tags-grid">
      <view
        v-for="tag in behaviorTags"
        :key="tag.id"
        class="tag-card"
        :class="{ 'tag-triggered': tag.triggered }"
      >
        <view class="tag-header">
          <text class="tag-label">{{ tag.label }}</text>
          <wd-icon
            :name="tag.triggered ? 'warning' : 'success'"
            :color="tag.triggered ? '#C4A882' : '#B8C4CE'"
            size="36rpx"
          />
        </view>
        <view class="tag-desc">{{ tag.description }}</view>
        <view class="tag-condition" :class="{ 'tag-condition-active': tag.triggered }">
          {{ tag.triggered ? '已触发' : '未触发' }}
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">冲动行为分析</view>
      <view class="impulse-stats">
        <view class="impulse-stat-item">
          <view class="impulse-stat-value">{{ viewCount }}</view>
          <view class="impulse-stat-label">查看账户</view>
        </view>
        <view class="impulse-stat-item">
          <view class="impulse-stat-value">{{ reduceCount }}</view>
          <view class="impulse-stat-label">减仓操作</view>
        </view>
        <view class="impulse-stat-item">
          <view class="impulse-stat-value">{{ addCount }}</view>
          <view class="impulse-stat-label">新增仓位</view>
        </view>
      </view>
      <view v-if="viewCount > 10" class="impulse-warning">
        <wd-icon name="warning" color="#C4A882" size="28rpx" />
        <text class="impulse-warning-text">
          你在市场下跌期间查看账户次数明显增加。这种行为通常意味着：当前仓位波动已经超出舒适区。
        </text>
      </view>
    </view>

    <view class="card growth-card">
      <view class="section-title">情绪稳定成长</view>
      <view class="growth-highlight">
        <view class="growth-big-number">
          <text class="growth-big-value">{{ growthMetrics.stableDays }}</text>
          <text class="growth-big-unit">天</text>
        </view>
        <view class="growth-big-label">连续无冲动操作</view>
      </view>
      <view class="growth-metrics">
        <view class="growth-metric-item">
          <view class="growth-metric-header">
            <text class="growth-metric-label">风险控制率</text>
            <text class="growth-metric-value">{{ (growthMetrics.riskControlRate * 100).toFixed(1) }}%</text>
          </view>
          <wd-progress
            :percentage="growthMetrics.riskControlRate * 100"
            :color="'#8B9DC3'"
            :track-color="'#E8ECF1'"
            hide-text
          />
        </view>
        <view class="growth-metric-item">
          <view class="growth-metric-header">
            <text class="growth-metric-label">情绪稳定度</text>
            <text class="growth-metric-value">{{ (growthMetrics.emotionStability * 100).toFixed(1) }}%</text>
          </view>
          <wd-progress
            :percentage="growthMetrics.emotionStability * 100"
            :color="'#A8B5C8'"
            :track-color="'#E8ECF1'"
            hide-text
          />
        </view>
        <view class="growth-metric-item">
          <view class="growth-metric-header">
            <text class="growth-metric-label">长期持有指数</text>
            <text class="growth-metric-value">{{ (growthMetrics.longTermHoldIndex * 100).toFixed(1) }}%</text>
          </view>
          <wd-progress
            :percentage="growthMetrics.longTermHoldIndex * 100"
            :color="'#9BAAB8'"
            :track-color="'#E8ECF1'"
            hide-text
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CarbonIcon from '@/components/CarbonIcon.vue'
import { useFundStore, useGrowthStore } from '@/store'
import { behaviorApi } from '@/services/api'
import type { InvestmentPersonality, BehaviorTag } from '@/types'

const fundStore = useFundStore()
const growthStore = useGrowthStore()

const personality = ref<InvestmentPersonality>({
  type: 'balanced', label: '均衡配置型', description: '资产配置相对均衡，风险适中', traits: ['配置相对均衡', '风险适中', '操作频率正常', '情绪较为稳定'], score: 50,
})
const behaviorTags = ref<BehaviorTag[]>([])
const growthMetrics = computed(() => growthStore.metrics)
const viewCount = ref(0)
const reduceCount = ref(0)
const addCount = ref(0)

const personalityScoreType = computed(() => {
  const score = personality.value.score
  if (score <= 30) return 'success'
  if (score <= 60) return 'warning'
  return 'danger'
})

onMounted(async () => {
  try {
    const [p, t, s] = await Promise.all([
      behaviorApi.getPersonality() as Promise<InvestmentPersonality>,
      behaviorApi.getTags() as Promise<BehaviorTag[]>,
      behaviorApi.getStats() as Promise<any>,
    ])
    personality.value = p
    behaviorTags.value = t
    viewCount.value = s?.viewCount ?? 0
    reduceCount.value = s?.reduceCount ?? 0
    addCount.value = s?.addCount ?? 0
  } catch (e) {
    console.error('loadBehaviorData failed:', e)
  }
  growthStore.loadMetrics()
})
</script>

<style lang="scss" scoped>
.container {
  padding: 24rpx 32rpx;
  padding-bottom: 48rpx;
}

.personality-card {
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 32rpx;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.08;
    border-radius: 24rpx;
    z-index: 0;
  }
}

.personality-aggressive_growth {
  background: linear-gradient(135deg, #E8D5C4 0%, #D4C5B5 100%);
}

.personality-emotion_sensitive {
  background: linear-gradient(135deg, #D5D8E8 0%, #C4C8D8 100%);
}

.personality-diversified_safe {
  background: linear-gradient(135deg, #C8D8D0 0%, #B8C8C0 100%);
}

.personality-theme_gambler {
  background: linear-gradient(135deg, #E0C8C8 0%, #D0B8B8 100%);
}

.personality-long_term_holder {
  background: linear-gradient(135deg, #C8D0D8 0%, #B8C0C8 100%);
}

.personality-balanced {
  background: linear-gradient(135deg, #D0D0D8 0%, #C0C0C8 100%);
}

.personality-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  position: relative;
  z-index: 1;
}

.personality-label {
  font-size: 44rpx;
  font-weight: 700;
  color: #3D3D3D;
  letter-spacing: 2rpx;
}

.personality-desc {
  font-size: 28rpx;
  color: #5A5A5A;
  margin-bottom: 28rpx;
  position: relative;
  z-index: 1;
}

.personality-traits {
  position: relative;
  z-index: 1;
}

.trait-item {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.trait-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #8B8B8B;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.trait-text {
  font-size: 26rpx;
  color: #4A4A4A;
}

.section-header {
  margin-bottom: 20rpx;
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.tag-card {
  width: calc(50% - 8rpx);
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  border: 2rpx solid #E8ECF1;
  transition: all 0.3s ease;
}

.tag-triggered {
  border-color: #C4A882;
  background: #FDF8F3;
}

.tag-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.tag-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D3D3D;
}

.tag-desc {
  font-size: 24rpx;
  color: #8B9DC3;
  margin-bottom: 16rpx;
}

.tag-condition {
  font-size: 22rpx;
  color: #B8C4CE;
  padding: 4rpx 16rpx;
  background: #F1F4F8;
  border-radius: 8rpx;
  display: inline-block;
}

.tag-condition-active {
  color: #C4A882;
  background: #F5EDE3;
}

.impulse-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24rpx;
}

.impulse-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.impulse-stat-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #3D3D3D;
  margin-bottom: 8rpx;
}

.impulse-stat-label {
  font-size: 24rpx;
  color: #8B9DC3;
}

.impulse-warning {
  display: flex;
  align-items: flex-start;
  background: #FDF8F3;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  gap: 12rpx;
}

.impulse-warning-text {
  font-size: 24rpx;
  color: #8B7D6B;
  line-height: 1.6;
  flex: 1;
}

.growth-card {
  margin-top: 24rpx;
}

.growth-highlight {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 36rpx;
  padding: 24rpx 0;
}

.growth-big-number {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.growth-big-value {
  font-size: 88rpx;
  font-weight: 700;
  color: #3D3D3D;
  line-height: 1;
}

.growth-big-unit {
  font-size: 28rpx;
  color: #8B9DC3;
  margin-left: 8rpx;
}

.growth-big-label {
  font-size: 26rpx;
  color: #8B9DC3;
}

.growth-metrics {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.growth-metric-item {
  width: 100%;
}

.growth-metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.growth-metric-label {
  font-size: 26rpx;
  color: #64748B;
}

.growth-metric-value {
  font-size: 26rpx;
  color: #3D3D3D;
  font-weight: 600;
}
</style>
