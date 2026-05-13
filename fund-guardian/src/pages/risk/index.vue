<template>
  <view class="container">
    <view class="card">
      <view class="section-title">压力测试</view>
      <view v-if="scenarios.length === 0" class="empty-tip">
        <text class="empty-text">暂无压力测试场景</text>
      </view>
      <view class="scenario-list">
        <view
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="scenario-item"
          @tap="handleScenarioTap(scenario)"
        >
          <view class="scenario-info">
            <view class="scenario-name">{{ scenario.name }}</view>
            <view class="scenario-desc">{{ scenario.description }}</view>
          </view>
          <wd-icon name="arrow-right" color="#B8C4CE" size="32rpx" />
        </view>
      </view>
    </view>

    <wd-popup
      v-model="showResult"
      position="bottom"
      closable
      custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx; max-height: 70vh;"
    >
      <view class="result-popup">
        <view class="result-title">{{ stressResult?.scenario.name }} 测试结果</view>
        <view class="result-summary">
          <view class="result-summary-item">
            <view class="result-summary-label">预计账户回撤</view>
            <view class="result-summary-value result-danger">
              -{{ stressResult?.portfolioDrop.toFixed(1) }}%
            </view>
          </view>
          <view class="result-summary-item">
            <view class="result-summary-label">约亏损金额</view>
            <view class="result-summary-value result-danger">
              -{{ formatAmount(stressResult?.lossAmount || 0) }}
            </view>
          </view>
        </view>
        <view class="result-detail-title">各板块贡献明细</view>
        <view class="result-contributions">
          <view
            v-for="(contrib, idx) in stressResult?.sectorContributions"
            :key="idx"
            class="contribution-item"
          >
            <view class="contribution-sector">{{ contrib.sector }}</view>
            <view class="contribution-bar-wrap">
              <view
                class="contribution-bar"
                :style="{ width: getContributionWidth(contrib.contribution) }"
              />
            </view>
            <view class="contribution-value">-{{ contrib.contribution.toFixed(1) }}%</view>
          </view>
        </view>
        <view v-if="!stressResult?.sectorContributions?.length" class="empty-tip">
          <text class="empty-text">暂无持仓数据，无法计算贡献明细</text>
        </view>
      </view>
    </wd-popup>

    <view class="card">
      <view class="section-title">集中度分析</view>
      <view v-if="sectorList.length === 0" class="empty-tip">
        <text class="empty-text">暂无持仓数据</text>
      </view>
      <view v-else class="concentration-chart">
        <view
          v-for="item in sectorList"
          :key="item.sector"
          class="concentration-row"
        >
          <view class="concentration-label">
            <text class="concentration-name">{{ item.sector }}</text>
            <text class="concentration-percent">{{ (item.ratio * 100).toFixed(1) }}%</text>
          </view>
          <view class="concentration-bar-wrap">
            <view
              class="concentration-bar"
              :class="{ 'concentration-bar-high': item.ratio > 0.4 }"
              :style="{
                width: (item.ratio * 100) + '%',
                backgroundColor: item.ratio > 0.4 ? '#C4A882' : getSectorColor(item.sector),
              }"
            />
          </view>
          <view v-if="item.ratio > 0.4" class="concentration-warning">
            <wd-icon name="warning" color="#C4A882" size="24rpx" />
          </view>
        </view>
      </view>
      <view v-if="sectorList.length > 0" class="concentration-summary">
        <view class="concentration-summary-item">
          <text class="concentration-summary-label">高波动资产占比</text>
          <text class="concentration-summary-value">{{ (highVolRatio * 100).toFixed(1) }}%</text>
        </view>
        <view class="concentration-summary-item">
          <text class="concentration-summary-label">现金比例</text>
          <text class="concentration-summary-value">{{ (fundStore.cashRatio * 100).toFixed(1) }}%</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title">风险时间轴</view>
      <view v-if="timelineEvents.length === 0" class="empty-tip">
        <text class="empty-text">暂无风险记录</text>
      </view>
      <view v-else class="timeline">
        <view
          v-for="(event, idx) in timelineEvents"
          :key="idx"
          class="timeline-item"
        >
          <view class="timeline-line-wrap">
            <view class="timeline-dot" :class="getEventDotClass(event)" />
            <view v-if="idx < timelineEvents.length - 1" class="timeline-line" />
          </view>
          <view class="timeline-content">
            <view class="timeline-date">{{ formatDate(event.createTime) }}</view>
            <view class="timeline-desc">{{ event.description }}</view>
            <view v-if="event.riskScore !== undefined" class="timeline-score">
              风险指数：{{ event.riskScore }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CarbonIcon from '@/components/CarbonIcon.vue'
import { useFundStore } from '@/store'
import { riskApi, portfolioApi } from '@/services/api'
import type { StressTestScenario, StressTestResult } from '@/types'
import { SECTOR_COLORS } from '@/types'

const fundStore = useFundStore()

const scenarios = ref<StressTestScenario[]>([])
const showResult = ref(false)
const stressResult = ref<StressTestResult | null>(null)

const sectorRatios = computed(() => fundStore.sectorRatios)
const highVolRatio = computed(() => fundStore.highVolatilityRatio)

const sectorList = computed(() => {
  return Object.entries(sectorRatios.value)
    .map(([sector, data]) => ({
      sector,
      ratio: data.ratio,
      amount: data.amount,
    }))
    .sort((a, b) => b.ratio - a.ratio)
})

interface TimelineEvent {
  createTime: number
  description: string
  riskScore?: number
  type: 'risk' | 'action' | 'behavior'
}

const timelineEvents = ref<TimelineEvent[]>([])

onMounted(async () => {
  try {
    const result = await riskApi.getScenarios() as any
    scenarios.value = result?.scenarios || result || []
  } catch (e) {
    console.error('loadScenarios failed:', e)
  }
  try {
    const actions = await portfolioApi.getActions() as any[]
    const events: TimelineEvent[] = (actions || [])
      .filter((a: any) => new Date(a.createTime || a.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)
      .map((a: any) => {
        const typeMap: Record<string, string> = { reduce: '减仓操作', add: '加仓操作', rebalance: '再平衡操作' }
        return { createTime: new Date(a.createTime || a.createdAt).getTime(), description: `${typeMap[a.actionType] || '操作'}：${a.reason || '无备注'}`, type: 'action' as const }
      })
    timelineEvents.value = events.sort((a, b) => b.createTime - a.createTime).slice(0, 20)
  } catch (e) {
    console.error('loadActions failed:', e)
  }
})

async function handleScenarioTap(scenario: StressTestScenario) {
  try {
    const result = await fundStore.runStressTest(scenario)
    stressResult.value = result
    showResult.value = true
  } catch (e) {
    console.error('runStressTest failed:', e)
    uni.showToast({ title: '测试失败', icon: 'none' })
  }
}

function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万'
  }
  return amount.toFixed(2)
}

function getContributionWidth(contribution: number): string {
  const maxContrib = Math.max(
    ...(stressResult.value?.sectorContributions.map(c => c.contribution) || [1])
  )
  const percent = maxContrib > 0 ? (contribution / maxContrib) * 100 : 0
  return Math.max(percent, 8) + '%'
}

function getSectorColor(sector: string): string {
  return (SECTOR_COLORS as Record<string, string>)[sector] || '#94A3B8'
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function getEventDotClass(event: TimelineEvent): string {
  if (event.type === 'risk') return 'timeline-dot-risk'
  if (event.type === 'action') return 'timeline-dot-action'
  return 'timeline-dot-behavior'
}
</script>

<style lang="scss" scoped>
.container {
  padding: 24rpx 32rpx;
  padding-bottom: 48rpx;
}

.scenario-list {
  display: flex;
  flex-direction: column;
}

.scenario-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F1F4F8;

  &:last-child {
    border-bottom: none;
  }
}

.scenario-info {
  flex: 1;
}

.scenario-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D3D3D;
  margin-bottom: 6rpx;
}

.scenario-desc {
  font-size: 24rpx;
  color: #8B9DC3;
}

.result-popup {
  width: 100%;
}

.result-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3D3D3D;
  margin-bottom: 32rpx;
  text-align: center;
}

.result-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 36rpx;
  padding: 24rpx 0;
  background: #FDF8F3;
  border-radius: 16rpx;
}

.result-summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-summary-label {
  font-size: 24rpx;
  color: #8B9DC3;
  margin-bottom: 8rpx;
}

.result-summary-value {
  font-size: 36rpx;
  font-weight: 700;
}

.result-danger {
  color: #C4A882;
}

.result-detail-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D3D3D;
  margin-bottom: 20rpx;
}

.result-contributions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.contribution-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.contribution-sector {
  font-size: 24rpx;
  color: #64748B;
  width: 80rpx;
  flex-shrink: 0;
}

.contribution-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: #F1F4F8;
  border-radius: 8rpx;
  overflow: hidden;
}

.contribution-bar {
  height: 100%;
  border-radius: 8rpx;
  background: #C4A882;
  min-width: 8%;
  transition: width 0.3s ease;
}

.contribution-value {
  font-size: 24rpx;
  color: #C4A882;
  width: 100rpx;
  text-align: right;
  flex-shrink: 0;
}

.empty-tip {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #B8C4CE;
}

.concentration-chart {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.concentration-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.concentration-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 180rpx;
  flex-shrink: 0;
}

.concentration-name {
  font-size: 24rpx;
  color: #64748B;
}

.concentration-percent {
  font-size: 22rpx;
  color: #8B9DC3;
  margin-left: auto;
}

.concentration-bar-wrap {
  flex: 1;
  height: 20rpx;
  background: #F1F4F8;
  border-radius: 10rpx;
  overflow: hidden;
}

.concentration-bar {
  height: 100%;
  border-radius: 10rpx;
  transition: width 0.3s ease;
  min-width: 4rpx;
}

.concentration-bar-high {
  opacity: 0.85;
}

.concentration-warning {
  flex-shrink: 0;
  margin-left: 4rpx;
}

.concentration-summary {
  display: flex;
  justify-content: space-around;
  padding-top: 24rpx;
  border-top: 1rpx solid #F1F4F8;
}

.concentration-summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.concentration-summary-label {
  font-size: 24rpx;
  color: #8B9DC3;
  margin-bottom: 8rpx;
}

.concentration-summary-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #3D3D3D;
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 20rpx;
  min-height: 100rpx;
}

.timeline-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24rpx;
  flex-shrink: 0;
}

.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 8rpx;
}

.timeline-dot-risk {
  background: #8B9DC3;
}

.timeline-dot-action {
  background: #C4A882;
}

.timeline-dot-behavior {
  background: #B8C4CE;
}

.timeline-line {
  width: 2rpx;
  flex: 1;
  background: #E8ECF1;
  margin-top: 8rpx;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24rpx;
}

.timeline-date {
  font-size: 22rpx;
  color: #B8C4CE;
  margin-bottom: 6rpx;
}

.timeline-desc {
  font-size: 26rpx;
  color: #3D3D3D;
  line-height: 1.5;
}

.timeline-score {
  font-size: 22rpx;
  color: #8B9DC3;
  margin-top: 4rpx;
}
</style>
