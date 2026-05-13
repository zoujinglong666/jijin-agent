<template>
  <view class="history-page">
    <wd-tabs v-model="activeTab" custom-style="--wd-tabs-nav-bg: #F8FAFC;">
      <wd-tab title="减仓记录">
        <view class="tab-content">
          <view v-if="actions.length === 0" class="empty-wrap">
            <wd-empty description="暂无减仓记录" />
          </view>
          <view v-else>
            <view v-for="item in actions" :key="item.id" class="record-card">
              <view class="record-header">
                <text class="record-date">{{ formatDate(item.createTime) }}</text>
                <wd-tag type="warning" plain size="small" custom-style="border-radius: 8rpx;">
                  -{{ (item.ratio * 100).toFixed(1) }}%
                </wd-tag>
              </view>
              <view class="record-body">
                <text class="record-fund-name">{{ getFundName(item.fundId) }}</text>
              </view>
              <view v-if="item.reason" class="record-reason">
                <CarbonIcon name="notes" size="14" color="#94A3B8" />
                <text class="reason-text">{{ item.reason }}</text>
              </view>
            </view>
          </view>
        </view>
      </wd-tab>

      <wd-tab title="风险变化">
        <view class="tab-content">
          <view v-if="riskHistory.length === 0" class="empty-wrap">
            <wd-empty description="暂无风险记录" />
          </view>
          <view v-else>
            <view class="card chart-card">
              <view class="section-title">风险指数趋势（近30天）</view>
              <view class="chart-area">
                <view class="chart-y-axis">
                  <text class="y-label">100</text>
                  <text class="y-label">75</text>
                  <text class="y-label">50</text>
                  <text class="y-label">25</text>
                  <text class="y-label">0</text>
                </view>
                <view class="chart-body">
                  <view class="chart-grid">
                    <view class="grid-line"></view>
                    <view class="grid-line"></view>
                    <view class="grid-line"></view>
                    <view class="grid-line"></view>
                  </view>
                  <view class="chart-bars">
                    <view
                      v-for="(item, i) in riskHistory.slice(-15)"
                      :key="i"
                      class="chart-bar-wrapper"
                    >
                      <view
                        class="chart-bar"
                        :style="{
                          height: item.riskScore + '%',
                          background: getRiskBarColor(item.riskScore),
                        }"
                      ></view>
                      <text class="bar-label">{{ formatShortDate(item.createTime) }}</text>
                    </view>
                  </view>
                </view>
              </view>
              <view class="chart-legend">
                <view class="legend-item">
                  <view class="legend-dot" style="background: #8B9DC3;"></view>
                  <text class="legend-text">稳健 (≤30)</text>
                </view>
                <view class="legend-item">
                  <view class="legend-dot" style="background: #A8B5D1;"></view>
                  <text class="legend-text">中性 (31-60)</text>
                </view>
                <view class="legend-item">
                  <view class="legend-dot" style="background: #C4A882;"></view>
                  <text class="legend-text">激进 (61-80)</text>
                </view>
                <view class="legend-item">
                  <view class="legend-dot" style="background: #C48282;"></view>
                  <text class="legend-text">高风险 (>80)</text>
                </view>
              </view>
            </view>

            <view class="card">
              <view class="section-title">风险记录详情</view>
              <view v-for="item in riskHistory" :key="item.id" class="risk-item">
                <view class="risk-item-left">
                  <text class="risk-item-date">{{ formatDate(item.createTime) }}</text>
                </view>
                <view class="risk-item-right">
                  <text class="risk-item-score" :style="{ color: getRiskBarColor(item.riskScore) }">
                    {{ item.riskScore }}
                  </text>
                  <wd-tag
                    :type="getRiskTagType(item.riskScore)"
                    plain
                    size="small"
                    custom-style="border-radius: 8rpx;"
                  >
                    {{ getRiskLabel(item.riskScore) }}
                  </wd-tag>
                </view>
              </view>
            </view>
          </view>
        </view>
      </wd-tab>

      <wd-tab title="行为日志">
        <view class="tab-content">
          <view v-if="behaviorLogs.length === 0" class="empty-wrap">
            <wd-empty description="暂无行为日志" />
          </view>
          <view v-else>
            <view v-for="item in behaviorLogs" :key="item.id" class="log-card">
              <view class="log-left">
                <view class="log-icon-wrap" :style="{ background: getEventBgColor(item.eventType) }">
                  <CarbonIcon :name="getEventIcon(item.eventType)" size="16" :color="getEventColor(item.eventType)" />
                </view>
              </view>
              <view class="log-right">
                <view class="log-header">
                  <text class="log-event-type">{{ getEventLabel(item.eventType) }}</text>
                  <text class="log-time">{{ formatDateTime(item.eventTime) }}</text>
                </view>
                <text v-if="item.payload" class="log-desc">{{ parsePayload(item.payload) }}</text>
              </view>
            </view>
          </view>
        </view>
      </wd-tab>

      <wd-tab title="情绪指数">
        <view class="tab-content">
          <view v-if="emotionHistory.length === 0" class="empty-wrap">
            <wd-empty description="暂无情绪记录" />
          </view>
          <view v-else>
            <view class="card emotion-summary">
              <view class="section-title">情绪概览</view>
              <view class="emotion-current">
                <text class="emotion-current-label">最新情绪指数</text>
                <view class="emotion-current-value">
                  <text class="emotion-score" :style="{ color: getEmotionColor(emotionHistory[0].emotionScore) }">
                    {{ emotionHistory[0].emotionScore }}
                  </text>
                  <wd-tag
                    :type="getEmotionTagType(emotionHistory[0].emotionScore)"
                    plain
                    size="small"
                    custom-style="border-radius: 8rpx; margin-left: 12rpx;"
                  >
                    {{ getEmotionLabel(emotionHistory[0].emotionScore) }}
                  </wd-tag>
                </view>
              </view>
            </view>

            <view class="card">
              <view class="section-title">历史记录</view>
              <view v-for="item in emotionHistory" :key="item.id" class="emotion-item">
                <view class="emotion-item-left">
                  <text class="emotion-item-date">{{ formatDate(item.createTime) }}</text>
                </view>
                <view class="emotion-item-right">
                  <text class="emotion-item-score" :style="{ color: getEmotionColor(item.emotionScore) }">
                    {{ item.emotionScore }}
                  </text>
                  <wd-tag
                    :type="getEmotionTagType(item.emotionScore)"
                    plain
                    size="small"
                    custom-style="border-radius: 8rpx;"
                  >
                    {{ getEmotionLabel(item.emotionScore) }}
                  </wd-tag>
                </view>
              </view>
            </view>
          </view>
        </view>
      </wd-tab>
    </wd-tabs>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { portfolioApi, behaviorApi, riskApi } from '@/services/api'
import type { ActionRecord, UserBehaviorLog, EmotionHistory, RiskHistory } from '@/types'
import type { TagType } from '@wot-ui/ui/components/wd-tag/types'

const activeTab = ref(0)
const actions = ref<ActionRecord[]>([])
const fundMap = ref<Record<string, string>>({})
const behaviorLogs = ref<UserBehaviorLog[]>([])
const emotionHistory = ref<EmotionHistory[]>([])
const riskHistory = ref<RiskHistory[]>([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  try {
    const [fundsResult, actionsResult] = await Promise.all([
      portfolioApi.getFunds() as any,
      portfolioApi.getActions() as unknown as any[],
    ])
    const funds = fundsResult || []
    const map: Record<string, string> = {}
    funds.forEach((f: any) => { map[f.id] = f.name })
    fundMap.value = map

    actions.value = (actionsResult || [])
      .filter((a: any) => a.actionType === 'reduce')
      .map((a: any) => ({
        id: a.id, fundId: a.fundId, actionType: a.actionType, ratio: Number(a.ratio),
        reason: a.reason || '', createTime: new Date(a.createTime || a.createdAt).getTime(),
      }))
      .sort((a: any, b: any) => b.createTime - a.createTime)
  } catch (e) {
    console.error('loadData failed:', e)
  }

  // 加载行为日志
  try {
    const logs = await behaviorApi.getLogs() as unknown as any[]
    behaviorLogs.value = (logs || []).map((l: any) => ({
      id: l.id,
      eventType: l.eventType,
      eventTime: new Date(l.createdAt || l.eventTime).getTime(),
      payload: l.payload || '',
    }))
  } catch (e) {
    console.error('loadBehaviorLogs failed:', e)
  }

  // 加载情绪历史和风险历史
  try {
    const history = await riskApi.getHistory() as unknown as any[]
    const mapped = (history || []).map((h: any) => ({
      id: h.id,
      riskScore: h.riskScore ?? h.emotionScore ?? 0,
      emotionScore: h.riskScore ?? h.emotionScore ?? 0,
      snapshotJson: h.snapshotJson || '',
      createTime: new Date(h.createTime || h.createdAt).getTime(),
    })).sort((a: any, b: any) => b.createTime - a.createTime)
    riskHistory.value = mapped
    emotionHistory.value = mapped
  } catch (e) {
    console.error('loadEmotionHistory failed:', e)
  }
}

function getFundName(fundId: string): string {
  return fundMap.value[fundId] || '未知基金'
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parsePayload(payload: string): string {
  try {
    const obj = JSON.parse(payload)
    if (obj.name) return `操作对象：${obj.name}`
    if (obj.fundId) return `基金ID：${obj.fundId}`
    return payload
  } catch {
    return payload
  }
}

function getRiskBarColor(score: number): string {
  if (score <= 30) return '#8B9DC3'
  if (score <= 60) return '#A8B5D1'
  if (score <= 80) return '#C4A882'
  return '#C48282'
}

function getRiskLabel(score: number): string {
  if (score <= 30) return '稳健'
  if (score <= 60) return '中性'
  if (score <= 80) return '激进'
  return '高风险'
}

function getRiskTagType(score: number): TagType {
  if (score <= 30) return 'success'
  if (score <= 60) return 'primary'
  if (score <= 80) return 'warning'
  return 'danger'
}

function getEventIcon(type: UserBehaviorLog['eventType']): string {
  const map: Record<string, string> = {
    view_account: 'view',
    reduce_position: 'arrow-right',
    add_position: 'arrow-right',
    edit_position: 'edit',
    open_app: 'computer',
  }
  return map[type] || 'notes'
}

function getEventLabel(type: UserBehaviorLog['eventType']): string {
  const map: Record<string, string> = {
    view_account: '查看账户',
    reduce_position: '减仓操作',
    add_position: '新增持仓',
    edit_position: '编辑持仓',
    open_app: '打开应用',
  }
  return map[type] || '未知操作'
}

function getEventColor(type: UserBehaviorLog['eventType']): string {
  const map: Record<string, string> = {
    view_account: '#8B9DC3',
    reduce_position: '#C4A882',
    add_position: '#82A8C4',
    edit_position: '#A8B5D1',
    open_app: '#94A3B8',
  }
  return map[type] || '#94A3B8'
}

function getEventBgColor(type: UserBehaviorLog['eventType']): string {
  const map: Record<string, string> = {
    view_account: '#EEF0F7',
    reduce_position: '#F5EFE5',
    add_position: '#E5EFF5',
    edit_position: '#EEF0F7',
    open_app: '#F1F5F9',
  }
  return map[type] || '#F1F5F9'
}

function getEmotionColor(score: number): string {
  if (score <= 30) return '#8B9DC3'
  if (score <= 60) return '#A8B5D1'
  if (score <= 80) return '#C4A882'
  return '#C48282'
}

function getEmotionLabel(score: number): string {
  if (score <= 30) return '平静'
  if (score <= 60) return '轻微波动'
  if (score <= 80) return '焦虑'
  return '恐慌'
}

function getEmotionTagType(score: number): TagType {
  if (score <= 30) return 'success'
  if (score <= 60) return 'primary'
  if (score <= 80) return 'warning'
  return 'danger'
}
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #F8FAFC;
}

.tab-content {
  padding: 24rpx 32rpx;
  min-height: 60vh;
}

.empty-wrap {
  padding-top: 120rpx;
}

.record-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.record-date {
  font-size: 24rpx;
  color: #94A3B8;
}

.record-body {
  margin-bottom: 8rpx;
}

.record-fund-name {
  font-size: 30rpx;
  color: #1E293B;
  font-weight: 500;
}

.record-reason {
  display: flex;
  align-items: flex-start;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #F1F5F9;
}

.reason-text {
  font-size: 24rpx;
  color: #64748B;
  margin-left: 8rpx;
  line-height: 1.5;
}

.chart-card {
  margin-bottom: 24rpx;
}

.chart-area {
  display: flex;
  height: 320rpx;
  margin: 24rpx 0;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 16rpx;
  padding-bottom: 40rpx;
}

.y-label {
  font-size: 20rpx;
  color: #94A3B8;
  text-align: right;
  width: 48rpx;
}

.chart-body {
  flex: 1;
  position: relative;
}

.chart-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.grid-line {
  height: 1rpx;
  background: #F1F5F9;
}

.chart-bars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  padding-bottom: 40rpx;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.chart-bar {
  width: 100%;
  max-width: 32rpx;
  border-radius: 6rpx 6rpx 0 0;
  min-height: 4rpx;
  transition: height 0.3s ease;
}

.bar-label {
  font-size: 16rpx;
  color: #94A3B8;
  margin-top: 8rpx;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F1F5F9;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.legend-text {
  font-size: 22rpx;
  color: #64748B;
}

.risk-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
}

.risk-item:last-child {
  border-bottom: none;
}

.risk-item-date {
  font-size: 26rpx;
  color: #64748B;
}

.risk-item-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.risk-item-score {
  font-size: 32rpx;
  font-weight: 600;
}

.log-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.log-left {
  margin-right: 20rpx;
}

.log-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-right {
  flex: 1;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.log-event-type {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.log-time {
  font-size: 22rpx;
  color: #94A3B8;
}

.log-desc {
  font-size: 24rpx;
  color: #64748B;
  line-height: 1.5;
}

.emotion-summary {
  margin-bottom: 24rpx;
}

.emotion-current {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}

.emotion-current-label {
  font-size: 28rpx;
  color: #64748B;
}

.emotion-current-value {
  display: flex;
  align-items: center;
}

.emotion-score {
  font-size: 40rpx;
  font-weight: 700;
}

.emotion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
}

.emotion-item:last-child {
  border-bottom: none;
}

.emotion-item-date {
  font-size: 26rpx;
  color: #64748B;
}

.emotion-item-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.emotion-item-score {
  font-size: 32rpx;
  font-weight: 600;
}
</style>
