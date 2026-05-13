<template>
  <view class="regret-page">
    <view class="intro-section">
      <view class="intro-card">
        <view class="intro-icon-wrap">
          <CarbonIcon name="time" size="28" color="#8B9DC3" />
        </view>
        <view class="intro-content">
          <text class="intro-title">看看如果当时做了不同决策，现在会怎样</text>
          <text class="intro-desc">这里只做历史模拟，不做未来预测</text>
        </view>
      </view>
    </view>

    <view class="disclaimer-banner">
      <CarbonIcon name="warning" size="14" color="#C4A882" />
      <text class="disclaimer-text">模拟结果仅供参考，不构成投资建议。历史表现不代表未来收益。</text>
    </view>

    <view v-if="funds.length === 0" class="empty-section">
      <wd-empty description="暂无持仓数据，请先添加基金" />
    </view>

    <view v-else class="scenarios-section">
      <view class="section-header">
        <CarbonIcon name="refresh" size="16" color="#6B7FD7" />
        <text class="section-title">模拟场景</text>
      </view>

      <view
        v-for="scenario in scenarios"
        :key="scenario.id"
        class="scenario-card"
        @tap="runSimulation(scenario)"
      >
        <view class="scenario-header">
          <view class="scenario-icon-wrap" :style="{ background: scenario.bgColor }">
            <CarbonIcon :name="scenario.icon" size="20" :color="scenario.iconColor" />
          </view>
          <view class="scenario-info">
            <text class="scenario-title">{{ scenario.title }}</text>
            <text class="scenario-desc">{{ scenario.desc }}</text>
          </view>
          <view class="scenario-arrow">
            <CarbonIcon name="forward" size="14" color="#CBD5E1" />
          </view>
        </view>
      </view>
    </view>

    <view v-if="currentResult" class="result-section">
      <view class="section-header">
        <CarbonIcon name="folder" size="16" color="#6B7FD7" />
        <text class="section-title">模拟结果</text>
      </view>

      <view class="card result-card">
        <view class="result-scenario-name">
          <text class="result-label">{{ currentResult.scenarioTitle }}</text>
        </view>

        <view class="result-compare">
          <view class="compare-item">
            <text class="compare-label">当前账户</text>
            <text class="compare-value">{{ formatAmount(totalAmount) }}元</text>
          </view>
          <view class="compare-arrow">
            <CarbonIcon name="refresh" size="20" color="#94A3B8" />
          </view>
          <view class="compare-item">
            <text class="compare-label">模拟账户</text>
            <text class="compare-value">{{ formatAmount(currentResult.simulatedAmount) }}元</text>
          </view>
        </view>

        <view class="result-details">
          <view class="detail-row">
            <text class="detail-label">波动变化</text>
            <text
              class="detail-value"
              :style="{ color: currentResult.volatilityChange < 0 ? '#8B9DC3' : '#C48282' }"
            >
              {{ currentResult.volatilityChange > 0 ? '+' : '' }}{{ currentResult.volatilityChange.toFixed(1) }}%
            </text>
          </view>
          <view class="detail-row">
            <text class="detail-label">收益变化</text>
            <text
              class="detail-value"
              :style="{ color: currentResult.profitChange > 0 ? '#8B9DC3' : '#C48282' }"
            >
              {{ currentResult.profitChange > 0 ? '+' : '' }}{{ currentResult.profitChange.toFixed(1) }}%
            </text>
          </view>
          <view class="detail-row">
            <text class="detail-label">风险指数变化</text>
            <text
              class="detail-value"
              :style="{ color: currentResult.riskChange < 0 ? '#8B9DC3' : '#C48282' }"
            >
              {{ currentResult.riskChange > 0 ? '+' : '' }}{{ currentResult.riskChange.toFixed(0) }}分
            </text>
          </view>
        </view>

        <view class="result-insight">
          <CarbonIcon name="message" size="14" color="#94A3B8" />
          <text class="insight-text">{{ currentResult.insight }}</text>
        </view>
      </view>

      <view class="card">
        <view class="section-title" style="font-size: 28rpx;">板块影响分析</view>
        <view v-for="item in currentResult.sectorImpacts" :key="item.sector" class="sector-impact-item">
          <view class="sector-impact-left">
            <view class="sector-dot" :style="{ background: getSectorColor(item.sector) }"></view>
            <text class="sector-impact-name">{{ item.sector }}</text>
          </view>
          <view class="sector-impact-right">
            <text class="sector-impact-ratio">占比{{ (item.originalRatio * 100).toFixed(1) }}%</text>
            <text
              class="sector-impact-change"
              :style="{ color: item.change < 0 ? '#8B9DC3' : '#C4A882' }"
            >
              {{ item.change > 0 ? '+' : '' }}{{ item.change.toFixed(1) }}%
            </text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-disclaimer">
      <text class="bottom-disclaimer-text">以上内容仅为风险分析参考，不构成投资建议。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFundStore } from '@/store'
import { regretApi } from '@/services/api'
import { SECTOR_COLORS } from '@/types'

const fundStore = useFundStore()

const funds = computed(() => fundStore.funds)
const totalAmount = computed(() => fundStore.totalAmount)

interface SimResult {
  scenarioTitle: string
  simulatedAmount: number
  volatilityChange: number
  profitChange: number
  riskChange: number
  insight: string
  sectorImpacts: {
    sector: string
    originalRatio: number
    change: number
  }[]
}

const currentResult = ref<SimResult | null>(null)
const scenarios = ref<any[]>([])
const isSimulating = ref(false)

onMounted(async () => {
  try {
    scenarios.value = await regretApi.getScenarios() as any
  } catch (e) {
    console.error('loadScenarios failed:', e)
  }
})

function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(1) + '万'
  }
  return amount.toFixed(0)
}

function getSectorColor(sector: string): string {
  return (SECTOR_COLORS as Record<string, string>)[sector] || '#94A3B8'
}

async function runSimulation(scenario: typeof scenarios.value[0]) {
  if (isSimulating.value) return
  isSimulating.value = true
  try {
    const result = await regretApi.runSimulation(scenario.id) as SimResult
    currentResult.value = result
    uni.pageScrollTo({ scrollTop: 99999, duration: 300 })
  } catch (e) {
    console.error('runSimulation failed:', e)
    uni.showToast({ title: '模拟失败，请重试', icon: 'none' })
  } finally {
    isSimulating.value = false
  }
}
</script>

<style lang="scss" scoped>
.regret-page {
  min-height: 100vh;
  background: #F8FAFC;
  padding-bottom: 60rpx;
}

.intro-section {
  padding: 32rpx;
}

.intro-card {
  background: linear-gradient(135deg, #EEF0F7 0%, #E8EBF5 100%);
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  display: flex;
  align-items: flex-start;
}

.intro-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.intro-content {
  flex: 1;
}

.intro-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
  display: block;
  margin-bottom: 8rpx;
  line-height: 1.5;
}

.intro-desc {
  font-size: 24rpx;
  color: #94A3B8;
}

.disclaimer-banner {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 32rpx;
  margin: 0 32rpx;
  background: #FDF8F0;
  border-radius: 12rpx;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #C4A882;
  line-height: 1.5;
}

.empty-section {
  padding-top: 120rpx;
}

.scenarios-section {
  padding: 24rpx 32rpx 0;
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

.scenario-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s;
}

.scenario-card:active {
  background: #F8F9FF;
  transform: scale(0.98);
}

.scenario-header {
  display: flex;
  align-items: center;
}

.scenario-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.scenario-info {
  flex: 1;
}

.scenario-title {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
  display: block;
  margin-bottom: 6rpx;
  line-height: 1.4;
}

.scenario-desc {
  font-size: 24rpx;
  color: #94A3B8;
}

.scenario-arrow {
  margin-left: 12rpx;
}

.result-section {
  padding: 24rpx 32rpx 0;
}

.result-card {
  margin-bottom: 24rpx;
}

.result-scenario-name {
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F1F5F9;
}

.result-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #1E293B;
}

.result-compare {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}

.compare-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.compare-label {
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 8rpx;
}

.compare-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
}

.compare-arrow {
  padding: 0 16rpx;
}

.result-details {
  padding: 16rpx 0;
  border-top: 1rpx solid #F1F5F9;
  border-bottom: 1rpx solid #F1F5F9;
  margin-bottom: 20rpx;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.detail-label {
  font-size: 26rpx;
  color: #64748B;
}

.detail-value {
  font-size: 28rpx;
  font-weight: 600;
}

.result-insight {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 16rpx;
  background: #F8F9FF;
  border-radius: 12rpx;
}

.insight-text {
  font-size: 24rpx;
  color: #64748B;
  line-height: 1.7;
  white-space: pre-line;
}

.sector-impact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
}

.sector-impact-item:last-child {
  border-bottom: none;
}

.sector-impact-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sector-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.sector-impact-name {
  font-size: 26rpx;
  color: #334155;
}

.sector-impact-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.sector-impact-ratio {
  font-size: 24rpx;
  color: #94A3B8;
}

.sector-impact-change {
  font-size: 26rpx;
  font-weight: 500;
  min-width: 80rpx;
  text-align: right;
}

.bottom-disclaimer {
  padding: 32rpx;
  text-align: center;
}

.bottom-disclaimer-text {
  font-size: 22rpx;
  color: #94A3B8;
}
</style>
