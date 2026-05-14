<template>
  <view class="home-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar__content">
        <view class="nav-bar__left">
          <text class="nav-bar__title">基金助手</text>
          <text class="nav-bar__subtitle">看清风险，减少冲动</text>
        </view>
        <view class="nav-bar__right">
          <view class="nav-bar__bell" @tap="goNotifications">
            <CarbonIcon name="bell" size="22" color="#64748B" />
            <wd-badge v-if="unreadAlertCount > 0" :model-value="unreadAlertCount" />
          </view>
        </view>
      </view>
      <view class="nav-bar__account">
        <text class="nav-bar__account-name">{{ currentAccountName }}</text>
      </view>
    </view>

    <view class="home-body" :style="{ paddingTop: statusBarHeight + 128 + 'px' }">
      <view v-if="fundStore.funds.length === 0" class="empty-state">
        <view class="empty-state__icon">
          <CarbonIcon name="folder" size="48" color="#CBD5E1" />
        </view>
        <text class="empty-state__title">还没有持仓数据</text>
        <text class="empty-state__desc">添加你的第一只基金，开始风险分析</text>
        <wd-button type="primary" size="medium" @click="goAddFund" custom-style="margin-top: 32rpx; background: #6B7FD7; border-color: #6B7FD7;">
          添加基金
        </wd-button>
      </view>

      <template v-else>
        <!-- Agent状态卡 -->
        <DemoBlock title="AI 风险 Agent" transparent>
          <view class="agent-header">
            <view class="agent-icon-wrap">
              <CarbonIcon name="chat" size="20" color="#6B7FD7" />
            </view>
            <text class="agent-title">AI 风险 Agent</text>
            <view class="agent-status" :class="{ running: agentStore.isRunning }">
              <view class="status-dot"></view>
              <text class="status-text">{{ agentStore.isRunning ? '分析中' : '监控中' }}</text>
            </view>
          </view>
          <view v-for="msg in agentStore.agentMessages.slice(0, 2)" :key="msg.id" class="agent-message">
            <view class="msg-title">{{ msg.title }}</view>
            <view class="msg-content">{{ msg.content }}</view>
            <view class="msg-meta">
              <text class="msg-time">{{ formatTime(msg.timestamp) }}</text>
              <text class="msg-source">AI Risk Agent</text>
            </view>
            <view class="msg-actions">
              <view class="msg-btn" @click="agentStore.dismissMessage(msg.id)">我知道了</view>
            </view>
          </view>
          <view v-if="agentStore.agentMessages.length === 0" class="agent-empty">
            <text class="agent-empty-text">Agent 正在监控你的持仓风险...</text>
          </view>
        </DemoBlock>

        <DemoBlock title="情绪风险指数">
          <view class="risk-index-card__header">
            <text class="section-title">情绪风险指数</text>
            <wd-tag :type="riskTagType" plain custom-style="font-size: 24rpx;">
              {{ fundStore.riskLevel.label }}
            </wd-tag>
          </view>
          <view class="risk-index-card__body">
            <view class="risk-ring-wrap">
              <view
                class="risk-ring"
                :style="{
                  background: `conic-gradient(${riskColor} ${riskAngle}deg, #F1F5F9 ${riskAngle}deg 360deg)`
                }"
              >
                <view class="risk-ring__inner">
                  <text class="risk-ring__score">{{ fundStore.emotionRiskScore }}</text>
                  <text class="risk-ring__unit">/ 100</text>
                </view>
              </view>
            </view>
            <view class="risk-index-card__info">
              <view class="risk-index-card__style">
                <text class="risk-index-card__style-label">投资风格</text>
                <text class="risk-index-card__style-value" :style="{ color: riskColor }">
                  {{ fundStore.investmentStyle }}
                </text>
              </view>
              <view class="risk-index-card__total">
                <text class="risk-index-card__total-label">总资产</text>
                <text class="risk-index-card__total-value">¥ {{ formattedTotalAmount }}</text>
              </view>
            </view>
          </view>
        </DemoBlock>

        <DemoBlock title="今日风险提示" v-if="visibleAlerts.length > 0">
          <view class="section-title-row">
            <text class="section-title">今日风险提示</text>
            <text class="risk-alert-card__count">{{ visibleAlerts.length }}条</text>
          </view>
          <view class="risk-alert-list">
            <wd-swipe-action
              v-for="alert in visibleAlerts"
              :key="alert.id"
            >
              <view class="risk-alert-item" :class="'risk-alert-item--' + alert.level">
                <view class="risk-alert-item__icon">
                  <text>{{ alertLevelIcon(alert.level) }}</text>
                </view>
                <view class="risk-alert-item__content">
                  <text class="risk-alert-item__title">{{ alert.title }}</text>
                  <text class="risk-alert-item__desc">{{ alert.content }}</text>
                </view>
              </view>
              <template #right>
                <wd-button
                  type="danger"
                  size="small"
                  @click="dismissAlert(alert.id)"
                  custom-style="height: 100%; border-radius: 0 16rpx 16rpx 0;"
                >
                  我知道了
                </wd-button>
              </template>
            </wd-swipe-action>
          </view>
        </DemoBlock>

        <DemoBlock v-else>
          <view class="safe-notice-card__icon">
            <CarbonIcon name="success" size="20" color="#6B7FD7" />
          </view>
          <text class="safe-notice-card__text">当前持仓风险可控</text>
        </DemoBlock>

        <DemoBlock title="仓位暴露图">
          <view class="sector-chart">
            <view
              v-for="item in sectorList"
              :key="item.name"
              class="sector-bar-row"
            >
              <text class="sector-bar-row__name">{{ item.name }}</text>
              <view class="sector-bar-row__track">
                <view
                  class="sector-bar-row__fill"
                  :style="{
                    width: item.ratioPercent + '%',
                    backgroundColor: item.color
                  }"
                />
              </view>
              <text class="sector-bar-row__percent">{{ item.ratioPercent }}%</text>
            </view>
          </view>
          <view class="sector-card__footer">
            <view class="sector-card__stat">
              <text class="sector-card__stat-label">高波动资产</text>
              <text class="sector-card__stat-value" :style="{ color: highVolColor }">
                {{ formattedHighVolRatio }}%
              </text>
            </view>
            <view class="sector-card__stat">
              <text class="sector-card__stat-label">现金比例</text>
              <text class="sector-card__stat-value">{{ formattedCashRatio }}%</text>
            </view>
          </view>
        </DemoBlock>

        <DemoBlock title="场景压力测试">
          <view class="section-title-row">
            <text class="section-title">场景压力测试</text>
            <view class="stress-card__more" @tap="goRiskCenter">
              <text class="stress-card__more-text">查看详情</text>
              <CarbonIcon name="arrow-right" size="14" color="#94A3B8" />
            </view>
          </view>
          <view class="stress-list">
            <view
              v-for="result in stressResults"
              :key="result.scenario.id"
              class="stress-item"
              @tap="goRiskCenter"
            >
              <view class="stress-item__info">
                <text class="stress-item__name">{{ result.scenario.name }}</text>
                <text class="stress-item__desc">{{ result.scenario.description }}</text>
              </view>
              <view class="stress-item__result">
                <text class="stress-item__drop" :class="{ 'stress-item__drop--high': result.portfolioDrop > 5 }">
                  -{{ result.portfolioDrop }}%
                </text>
                <text class="stress-item__loss">
                  -¥ {{ formatMoney(result.lossAmount) }}
                </text>
              </view>
            </view>
          </view>
        </DemoBlock>

        <DemoBlock title="最近减仓记录" v-if="latestReduceRecord">
          <view class="reduce-item">
            <view class="reduce-item__info">
              <text class="reduce-item__fund">{{ latestReduceFundName }}</text>
              <text class="reduce-item__reason">{{ latestReduceRecord.reason }}</text>
            </view>
            <view class="reduce-item__meta">
              <text class="reduce-item__ratio">减仓 {{ latestReduceRecord.ratio }}%</text>
              <text class="reduce-item__time">{{ formatTime(latestReduceRecord.createTime) }}</text>
            </view>
          </view>
        </DemoBlock>

        <DemoBlock title="AI 风险解读" card @tap="goAIAssistant">
          <view class="ai-card__header">
            <view class="ai-card__icon-wrap">
              <CarbonIcon name="chat" size="18" color="#6B7FD7" />
            </view>
            <text class="ai-card__title">AI 风险解读</text>
            <wd-icon name="arrow-right" size="28rpx" color="#94A3B8" custom-style="margin-left: auto;" />
          </view>
          <text class="ai-card__text">{{ aiRiskExplanation }}</text>
        </DemoBlock>

        <DemoBlock v-if="growthStore.metrics.stableDays > 0" card>
          <view class="growth-card__content">
            <view class="growth-card__icon-wrap">
              <text class="growth-card__emoji">🌱</text>
            </view>
            <view class="growth-card__info">
              <text class="growth-card__title">连续 {{ growthStore.metrics.stableDays }} 天无冲动操作</text>
              <text class="growth-card__desc">保持理性，你的投资心态正在成长</text>
            </view>
          </view>
        </DemoBlock>

        <view style="height: 32rpx;" />
      </template>
    </view>
    
    <!-- 小基助手悬浮按钮 -->
    <XiaojiAssistant />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFundStore, useAccountStore, useGrowthStore, useAgentStore } from '@/store'
import { behaviorApi, riskApi, portfolioApi } from '@/services/api'
import { SECTOR_COLORS } from '@/types'
import type { RiskAlert } from '@/types'
import DemoBlock from '@/components/DemoBlock.vue'
import XiaojiAssistant from '@/components/xiaoji-assistant/index.vue'

const fundStore = useFundStore()
const accountStore = useAccountStore()
const growthStore = useGrowthStore()
const agentStore = useAgentStore()

const statusBarHeight = ref(0)
const dismissedIds = ref<string[]>([])

try {
  const systemInfo = uni.getSystemInfoSync()
  statusBarHeight.value = systemInfo.statusBarHeight || 0
} catch {
  statusBarHeight.value = 0
}

onShow(async () => {
  await Promise.all([
    fundStore.loadFunds(),
    fundStore.loadAnalysis(),
    fundStore.loadRiskAlerts(),
    fundStore.loadPersonality(),
    fundStore.loadBehaviorTags(),
  ])
  behaviorApi.recordEvent('PORTFOLIO_VIEW').catch(() => {})
  agentStore.runAgent()

  // 加载最近减仓记录
  try {
    const actions = await portfolioApi.getActions() as any[]
    const reduceActions = (actions || [])
      .filter((a: any) => a.actionType === 'reduce')
      .sort((a: any, b: any) => new Date(b.createTime || b.createdAt).getTime() - new Date(a.createTime || a.createdAt).getTime())
    if (reduceActions.length > 0) {
      latestReduceRecord.value = reduceActions[0]
      const fund = fundStore.funds.find(f => f.id === reduceActions[0].fundId)
      latestReduceFundName.value = fund?.name || '未知基金'
    }
  } catch (e) {
    console.error('loadLatestReduce failed:', e)
  }

  // 加载压力测试
  try {
    const result = await riskApi.getScenarios() as any
    const scenarios = result?.scenarios || result || []
    if (scenarios.length > 0) {
      const top3 = scenarios.slice(0, 3)
      stressResults.value = await Promise.all(top3.map(async (s: any) => {
        try { return await fundStore.runStressTest(s) } catch { return null }
      })).then(results => results.filter(Boolean))
    }
  } catch (e) {
    console.error('loadStressTest failed:', e)
  }
})

const currentAccountName = computed(() => {
  const current = accountStore.accounts.find(a => a.id === accountStore.currentAccountId)
  return current ? current.name : '主账户'
})

const unreadAlertCount = computed(() => {
  return visibleAlerts.value.length
})

const riskColor = computed(() => fundStore.riskLevel.color)

const riskAngle = computed(() => (fundStore.emotionRiskScore / 100) * 360)

const riskTagType = computed(() => {
  const level = fundStore.riskLevel.level
  if (level === 'safe') return 'primary'
  if (level === 'neutral') return 'purple'
  if (level === 'aggressive') return 'warning'
  return 'danger'
})

const formattedTotalAmount = computed(() => formatMoney(fundStore.totalAmount))

const visibleAlerts = computed(() => {
  return fundStore.riskAlerts.filter(a => !dismissedIds.value.includes(a.id)).slice(0, 3)
})

const sectorList = computed(() => {
  const ratios = fundStore.sectorRatios
  return Object.entries(ratios)
    .map(([name, data]) => ({
      name,
      ratio: data.ratio,
      ratioPercent: Math.round(data.ratio * 1000) / 10,
      amount: data.amount,
      fundCount: data.fundCount,
      color: (SECTOR_COLORS as Record<string, string>)[name] || '#64748B',
    }))
    .sort((a, b) => b.ratio - a.ratio)
})

const formattedHighVolRatio = computed(() => (fundStore.highVolatilityRatio * 100).toFixed(1))

const formattedCashRatio = computed(() => (fundStore.cashRatio * 100).toFixed(1))

const highVolColor = computed(() => {
  const ratio = fundStore.highVolatilityRatio
  if (ratio > 0.7) return '#EF4444'
  if (ratio > 0.5) return '#F97316'
  return '#6B7FD7'
})

const stressResults = ref<any[]>([])

const latestReduceRecord = ref<any>(null)
const latestReduceFundName = ref('')

const aiRiskExplanation = computed(() => {
  const score = fundStore.emotionRiskScore
  const style = fundStore.investmentStyle
  const highVol = fundStore.highVolatilityRatio
  const cashR = fundStore.cashRatio

  if (score <= 30) {
    return `你的投资风格为${style}，当前持仓结构较为均衡，风险处于可控范围。高波动资产占比${(highVol * 100).toFixed(1)}%，现金储备${(cashR * 100).toFixed(1)}%，整体配置稳健。继续保持理性投资节奏。`
  }
  if (score <= 60) {
    return `你的投资风格为${style}，当前风险水平适中。高波动资产占比${(highVol * 100).toFixed(1)}%，建议关注单一板块集中度，适当分散配置以降低波动影响。`
  }
  if (score <= 80) {
    return `你的投资风格为${style}，当前风险偏高。高波动资产占比${(highVol * 100).toFixed(1)}%，现金仅${(cashR * 100).toFixed(1)}%，在市场剧烈波动时可能面临较大回撤。建议审视仓位结构，预留安全边际。`
  }
  return `你的投资风格为${style}，当前风险处于较高水平。高波动资产占比${(highVol * 100).toFixed(1)}%，现金储备仅${(cashR * 100).toFixed(1)}%，持仓集中度较高。极端行情下可能承受显著损失，强烈建议重新评估风险承受能力。`
})

function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

function alertLevelIcon(level: RiskAlert['level']): string {
  if (level === 'high') return '⚠️'
  if (level === 'medium') return '⚡'
  return '💡'
}

function dismissAlert(alertId: string) {
  dismissedIds.value = [...dismissedIds.value, alertId]
}

function goAddFund() {
  uni.navigateTo({ url: '/pages/add-fund/index' })
}

function goRiskCenter() {
  uni.switchTab({ url: '/pages/risk/index' })
}

function goAIAssistant() {
  uni.navigateTo({ url: '/pages/ai/index' })
}

function goNotifications() {
  uni.navigateTo({ url: '/pages/notifications/index' })
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background-color: #F8FAFC;
}

.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);

  &__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
  }

  &__title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1E293B;
    letter-spacing: 1rpx;
  }

  &__subtitle {
    font-size: 22rpx;
    color: #94A3B8;
    margin-left: 12rpx;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__bell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
  }

  &__account {
    padding: 0 32rpx 16rpx;

    &-name {
      font-size: 24rpx;
      color: #94A3B8;
    }
  }
}

.home-body {
  padding: 0 32rpx 32rpx;
}

.agent-card {
  background: linear-gradient(135deg, #F0F4FF 0%, #E8ECF8 100%);
  border: 2rpx solid rgba(107, 127, 215, 0.15);
}

.agent-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}

.agent-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(107, 127, 215, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.agent-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
  flex: 1;
}

.agent-status {
  display: flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(34, 197, 94, 0.1);

  &.running {
    background: rgba(107, 127, 215, 0.1);
  }
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #22C55E;
  margin-right: 8rpx;

  .running & {
    background: #6B7FD7;
    animation: pulse 1.5s infinite;
  }
}

.status-text {
  font-size: 22rpx;
  color: #64748B;
}

.agent-message {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.msg-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 12rpx;
}

.msg-content {
  font-size: 26rpx;
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.msg-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.msg-time, .msg-source {
  font-size: 22rpx;
  color: #94A3B8;
}

.msg-actions {
  display: flex;
  justify-content: flex-end;
}

.msg-btn {
  font-size: 24rpx;
  color: #6B7FD7;
  padding: 8rpx 24rpx;
  border-radius: 12rpx;
  background: rgba(107, 127, 215, 0.08);
}

.agent-empty {
  padding: 24rpx;
  text-align: center;
}

.agent-empty-text {
  font-size: 26rpx;
  color: #94A3B8;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 64rpx;

  &__icon {
    margin-bottom: 32rpx;
  }

  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #64748B;
    margin-bottom: 12rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: #94A3B8;
    text-align: center;
  }
}

.risk-index-card {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
  }

  &__body {
    display: flex;
    align-items: center;
    gap: 40rpx;
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  &__style,
  &__total {
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    &-label {
      font-size: 24rpx;
      color: #94A3B8;
    }

    &-value {
      font-size: 28rpx;
      font-weight: 600;
      color: #1E293B;
    }
  }

  &__style-value {
    font-size: 28rpx;
    font-weight: 600;
  }
}

.risk-ring-wrap {
  flex-shrink: 0;
}

.risk-ring {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.6s ease;

  &__inner {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: #FFFFFF;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4rpx;
  }

  &__score {
    font-size: 52rpx;
    font-weight: 700;
    color: #1E293B;
    line-height: 1;
  }

  &__unit {
    font-size: 22rpx;
    color: #94A3B8;
    font-weight: 400;
  }
}

.risk-alert-card {
  &__count {
    font-size: 24rpx;
    color: #94A3B8;
  }
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.risk-alert-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.risk-alert-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: #F8FAFC;

  &--high {
    background: #FEF2F2;
  }

  &--medium {
    background: #FFFBEB;
  }

  &--low {
    background: #F0F9FF;
  }

  &__icon {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28rpx;
  }

  &__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1E293B;
  }

  &__desc {
    font-size: 24rpx;
    color: #64748B;
    line-height: 1.5;
  }
}

.safe-notice-card {
  display: flex;
  align-items: center;
  gap: 16rpx;

  &__icon {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #EFF2FF;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__text {
    font-size: 28rpx;
    color: #6B7FD7;
    font-weight: 500;
  }
}

.sector-card {
  &__footer {
    display: flex;
    justify-content: space-between;
    margin-top: 28rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid #F1F5F9;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    &-label {
      font-size: 24rpx;
      color: #94A3B8;
    }

    &-value {
      font-size: 28rpx;
      font-weight: 600;
      color: #1E293B;
    }
  }
}

.sector-chart {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sector-bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;

  &__name {
    width: 80rpx;
    font-size: 24rpx;
    color: #64748B;
    flex-shrink: 0;
    text-align: right;
  }

  &__track {
    flex: 1;
    height: 20rpx;
    background: #F1F5F9;
    border-radius: 10rpx;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 10rpx;
    transition: width 0.5s ease;
    min-width: 4rpx;
  }

  &__percent {
    width: 80rpx;
    font-size: 24rpx;
    color: #64748B;
    text-align: right;
    flex-shrink: 0;
  }
}

.stress-card {
  &__more {
    display: flex;
    align-items: center;
    gap: 4rpx;

    &-text {
      font-size: 24rpx;
      color: #94A3B8;
    }
  }
}

.stress-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.stress-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: #F8FAFC;

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: #1E293B;
  }

  &__desc {
    font-size: 24rpx;
    color: #94A3B8;
  }

  &__result {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4rpx;
  }

  &__drop {
    font-size: 30rpx;
    font-weight: 700;
    color: #F97316;

    &--high {
      color: #EF4444;
    }
  }

  &__loss {
    font-size: 22rpx;
    color: #94A3B8;
  }
}

.reduce-card {
  .reduce-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 24rpx;
    border-radius: 16rpx;
    background: #F8FAFC;

    &__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4rpx;
    }

    &__fund {
      font-size: 28rpx;
      font-weight: 600;
      color: #1E293B;
    }

    &__reason {
      font-size: 24rpx;
      color: #64748B;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4rpx;
    }

    &__ratio {
      font-size: 28rpx;
      font-weight: 600;
      color: #F97316;
    }

    &__time {
      font-size: 22rpx;
      color: #94A3B8;
    }
  }
}

.ai-card {
  cursor: pointer;

  &__header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 20rpx;
  }

  &__icon-wrap {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #EFF2FF;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1E293B;
    flex: 1;
  }

  &__text {
    font-size: 26rpx;
    color: #64748B;
    line-height: 1.7;
  }
}

.growth-card {
  &__content {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }

  &__icon-wrap {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: #F0F9FF;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__emoji {
    font-size: 32rpx;
  }

  &__info {
    flex: 1;
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1E293B;
    margin-bottom: 4rpx;
  }

  &__desc {
    font-size: 24rpx;
    color: #94A3B8;
  }
}

@media (prefers-color-scheme: dark) {
  .home-page {
    background-color: #0F172A;
  }

  .nav-bar {
    background: linear-gradient(180deg, #1E293B 0%, #0F172A 100%);
  }

  .agent-card {
    background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
    border: 2rpx solid rgba(107, 127, 215, 0.2);
  }

  .risk-ring__inner {
    background: #1E293B;
  }

  .risk-ring__score {
    color: #F8FAFC;
  }

  .sector-card__stat-value,
  .reduce-item__fund,
  .ai-card__title,
  .growth-card__title {
    color: #F8FAFC;
  }

  .risk-alert-item {
    background: #1E293B;

    &--high {
      background: rgba(239, 68, 68, 0.1);
    }

    &--medium {
      background: rgba(249, 115, 22, 0.1);
    }

    &--low {
      background: rgba(14, 165, 233, 0.1);
    }
  }

  .stress-item,
  .reduce-item {
    background: #1E293B;
  }

  .safe-notice-card__icon {
    background: rgba(107, 127, 215, 0.1);
  }

  .safe-notice-card__text {
    color: #F8FAFC;
  }

  .ai-card__icon-wrap {
    background: rgba(107, 127, 215, 0.1);
  }

  .growth-card__icon-wrap {
    background: rgba(14, 165, 233, 0.1);
  }

  .ai-card__text {
    color: #CBD5E1;
  }

  .growth-card__desc {
    color: #94A3B8;
  }
}
</style>