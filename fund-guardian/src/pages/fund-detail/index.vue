<template>
  <view class="fund-detail-page">
    <view v-if="!fund" class="empty-state">
      <wd-icon name="warning" size="80rpx" color="#B0BEC5" />
      <text class="empty-text">未找到该基金信息</text>
    </view>

    <template v-if="fund">
      <view class="info-card">
        <view class="info-header">
          <view class="info-title-row">
            <text class="info-name">{{ fund.name }}</text>
            <wd-tag
              :bg-color="getSectorBgColor(fund.sector)"
              :color="getSectorColor(fund.sector)"
              size="small"
              plain
              round
            >
              {{ fund.sector }}
            </wd-tag>
          </view>
          <text class="info-code">{{ fund.code }}</text>
        </view>
        <view class="info-amount-row">
          <view class="info-amount-block">
            <text class="info-amount-label">持有金额</text>
            <text class="info-amount-value">{{ formatAmount(fund.amount) }}</text>
          </view>
          <view class="info-rate-block">
            <text class="info-rate-label">当前收益率</text>
            <text
              class="info-rate-value"
              :class="fund.profitRate >= 0 ? 'text-safe' : 'text-danger'"
            >
              {{ fund.profitRate >= 0 ? '+' : '' }}{{ fund.profitRate.toFixed(2) }}%
            </text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="section-title">仓位占比</text>
        <view class="ratio-row">
          <view class="ratio-item">
            <text class="ratio-label">占总资产</text>
            <text class="ratio-value">{{ totalAssetRatio.toFixed(1) }}%</text>
          </view>
          <view class="ratio-divider" />
          <view class="ratio-item">
            <text class="ratio-label">占{{ fund.sector }}主题</text>
            <text class="ratio-value">{{ sectorRatio.toFixed(1) }}%</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="section-title">风险标签</text>
        <view class="risk-tags">
          <wd-tag
            v-for="tag in riskTags"
            :key="tag.label"
            :bg-color="tag.bgColor"
            :color="tag.color"
            plain
            round
            size="medium"
            custom-style="margin: 8rpx 12rpx 8rpx 0;"
          >
            {{ tag.label }}
          </wd-tag>
          <view v-if="riskTags.length === 0" class="no-risk">
            <text class="no-risk-text">暂无风险标签</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="section-title">模拟减仓</text>
        <view class="simulate-area">
          <view class="simulate-row">
            <text class="simulate-label">减仓比例</text>
            <text class="simulate-percent">{{ reduceRatio }}%</text>
          </view>
          <wd-slider
            v-model="reduceRatio"
            :min="0"
            :max="100"
            :step="5"
            hide-label
            custom-style="margin: 16rpx 0;"
          />
          <view class="simulate-result">
            <text class="simulate-result-label">参考金额</text>
            <text class="simulate-result-value">{{ formatAmount(fund.amount * reduceRatio / 100) }}</text>
          </view>
          <wd-input
            v-model="reduceReason"
            placeholder="减仓原因（可选）"
            clearable
            custom-style="margin-top: 20rpx;"
          />
          <view class="simulate-warning">
            <wd-icon name="warning" size="28rpx" color="#F59E0B" />
            <text class="simulate-warning-text">该记录仅用于仓位管理，不会执行真实交易</text>
          </view>
          <wd-button
            type="primary"
            block
            :disabled="reduceRatio === 0"
            @click="showReduceConfirm"
            custom-style="margin-top: 24rpx; border-radius: 16rpx; height: 80rpx; background-color: #6B7FD7; border-color: #6B7FD7;"
          >
            记录减仓计划
          </wd-button>
        </view>
      </view>

      <view class="card">
        <text class="section-title">操作记录</text>
        <view v-if="actionRecords.length === 0" class="no-records">
          <text class="no-records-text">暂无操作记录</text>
        </view>
        <view
          v-for="record in actionRecords"
          :key="record.id"
          class="record-item"
        >
          <view class="record-left">
            <view class="record-dot" />
            <view class="record-info">
              <text class="record-action">减仓 {{ record.ratio }}%</text>
              <text v-if="record.reason" class="record-reason">{{ record.reason }}</text>
            </view>
          </view>
          <text class="record-time">{{ formatTime(record.createTime) }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <wd-button
          plain
          custom-style="border-radius: 16rpx; height: 80rpx; color: #6B7FD7; border-color: #6B7FD7;"
          @click="goToEdit"
        >
          编辑基金
        </wd-button>
      </view>
    </template>

    <wd-popup
      v-model="reducePopupVisible"
      position="center"
      :close-on-click-modal="true"
      custom-style="border-radius: 24rpx; width: 580rpx;"
    >
      <view class="reduce-popup">
        <text class="reduce-popup-title">确认记录减仓计划</text>
        <view class="reduce-popup-info">
          <view class="reduce-popup-row">
            <text class="reduce-popup-label">基金</text>
            <text class="reduce-popup-value">{{ fund?.name }}</text>
          </view>
          <view class="reduce-popup-row">
            <text class="reduce-popup-label">减仓比例</text>
            <text class="reduce-popup-value">{{ reduceRatio }}%</text>
          </view>
          <view class="reduce-popup-row">
            <text class="reduce-popup-label">参考金额</text>
            <text class="reduce-popup-value">{{ fund ? formatAmount(fund.amount * reduceRatio / 100) : '0' }}</text>
          </view>
          <view v-if="reduceReason" class="reduce-popup-row">
            <text class="reduce-popup-label">减仓原因</text>
            <text class="reduce-popup-value">{{ reduceReason }}</text>
          </view>
        </view>
        <view class="reduce-popup-warning">
          <wd-icon name="warning" size="28rpx" color="#F59E0B" />
          <text class="reduce-popup-warning-text">该记录仅用于仓位管理，不会执行真实交易</text>
        </view>
        <view class="reduce-popup-actions">
          <wd-button size="small" plain @click="reducePopupVisible = false">取消</wd-button>
          <wd-button size="small" type="primary" @click="doRecordReduce" custom-style="background-color: #6B7FD7; border-color: #6B7FD7;">确认记录</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useFundStore } from '@/store'
import { SECTOR_COLORS, HIGH_VOLATILITY_SECTORS } from '@/types'
import type { Fund, SectorType, ActionRecord } from '@/types'
import { portfolioApi } from '@/services/api'

const fundStore = useFundStore()
const fundId = ref('')
const reduceRatio = ref(0)
const reduceReason = ref('')
const reducePopupVisible = ref(false)

const fund = computed(() => {
  return fundStore.funds.find(f => f.id === fundId.value) || null
})

const totalAssetRatio = computed(() => {
  if (!fund.value || fundStore.totalAmount === 0) return 0
  return (fund.value.amount / fundStore.totalAmount) * 100
})

const sectorRatio = computed(() => {
  if (!fund.value) return 0
  const sectorData = fundStore.sectorRatios[fund.value.sector]
  if (!sectorData) return 0
  return (fund.value.amount / sectorData.amount) * 100
})

const riskTags = computed(() => {
  if (!fund.value) return []
  const tags: { label: string; color: string; bgColor: string }[] = []

  if (HIGH_VOLATILITY_SECTORS.includes(fund.value.sector as SectorType)) {
    tags.push({ label: '高波动', color: '#EF4444', bgColor: '#FEF2F2' })
  }

  if (totalAssetRatio.value > 20) {
    tags.push({ label: '集中度偏高', color: '#F97316', bgColor: '#FFF7ED' })
  } else if (totalAssetRatio.value > 10) {
    tags.push({ label: '集中度中等', color: '#F59E0B', bgColor: '#FFFBEB' })
  }

  if (fund.value.profitRate < -10) {
    tags.push({ label: '深度亏损', color: '#EF4444', bgColor: '#FEF2F2' })
  } else if (fund.value.profitRate < 0) {
    tags.push({ label: '浮亏中', color: '#F97316', bgColor: '#FFF7ED' })
  }

  if (fund.value.sector === '债券' || fund.value.sector === '现金') {
    tags.push({ label: '低风险', color: '#22C55E', bgColor: '#F0FDF4' })
  }

  return tags
})

const actionRecords = ref<ActionRecord[]>([])

onLoad(async (options) => {
  if (options?.fundId) {
    fundId.value = options.fundId
    await fundStore.loadFunds()
    await fundStore.loadAnalysis()
    try {
      const result = await portfolioApi.getActions(fundId.value) as any[]
      actionRecords.value = (result || []).map((a: any) => ({
        id: a.id, fundId: a.fundId, actionType: a.actionType, ratio: Number(a.ratio),
        reason: a.reason || '', createTime: new Date(a.createTime || a.createdAt).getTime(),
      })).sort((a: any, b: any) => b.createTime - a.createTime)
    } catch (e) {
      console.error('loadActions failed:', e)
    }
  }
})

function formatAmount(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector as SectorType] || '#64748B'
}

function getSectorBgColor(sector: string): string {
  const color = SECTOR_COLORS[sector as SectorType] || '#64748B'
  return color + '15'
}

function showReduceConfirm() {
  reducePopupVisible.value = true
}

function doRecordReduce() {
  if (!fundId.value) return
  fundStore.recordReducePosition(fundId.value, reduceRatio.value, reduceReason.value)
  reducePopupVisible.value = false
  reduceRatio.value = 0
  reduceReason.value = ''
  uni.showToast({ title: '已记录减仓计划', icon: 'success' })
}

function goToEdit() {
  uni.navigateTo({ url: `/pages/add-fund/index?fundId=${fundId.value}` })
}
</script>

<style lang="scss" scoped>
.fund-detail-page {
  min-height: 100vh;
  background-color: #F8FAFC;
  padding: 24rpx 32rpx 160rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #94A3B8;
  margin-top: 24rpx;
}

.info-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.info-header {
  margin-bottom: 28rpx;
}

.info-title-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.info-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
}

.info-code {
  display: block;
  font-size: 26rpx;
  color: #94A3B8;
  margin-top: 8rpx;
}

.info-amount-row {
  display: flex;
  gap: 48rpx;
}

.info-amount-block,
.info-rate-block {
  flex: 1;
}

.info-amount-label,
.info-rate-label {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 8rpx;
}

.info-amount-value {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #1E293B;
}

.info-rate-value {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 24rpx;
}

.ratio-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ratio-item {
  flex: 1;
  text-align: center;
}

.ratio-label {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 8rpx;
}

.ratio-value {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #6B7FD7;
}

.ratio-divider {
  width: 2rpx;
  height: 60rpx;
  background-color: #F1F5F9;
}

.risk-tags {
  display: flex;
  flex-wrap: wrap;
}

.no-risk {
  padding: 16rpx 0;
}

.no-risk-text {
  font-size: 26rpx;
  color: #B0BEC5;
}

.simulate-area {
  padding: 0 4rpx;
}

.simulate-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.simulate-label {
  font-size: 28rpx;
  color: #64748B;
}

.simulate-percent {
  font-size: 32rpx;
  font-weight: 600;
  color: #6B7FD7;
}

.simulate-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  background: #F8FAFC;
  border-radius: 16rpx;
}

.simulate-result-label {
  font-size: 26rpx;
  color: #64748B;
}

.simulate-result-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
}

.simulate-warning {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  background: #FFFBEB;
  border-radius: 12rpx;
}

.simulate-warning-text {
  font-size: 22rpx;
  color: #B45309;
}

.no-records {
  padding: 32rpx 0;
  text-align: center;
}

.no-records-text {
  font-size: 26rpx;
  color: #B0BEC5;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;

  &:last-child {
    border-bottom: none;
  }
}

.record-left {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.record-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #6B7FD7;
  margin-top: 10rpx;
  flex-shrink: 0;
}

.record-action {
  display: block;
  font-size: 28rpx;
  color: #1E293B;
}

.record-reason {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-top: 4rpx;
}

.record-time {
  font-size: 22rpx;
  color: #B0BEC5;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.reduce-popup {
  padding: 40rpx;
}

.reduce-popup-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1E293B;
  text-align: center;
  margin-bottom: 28rpx;
}

.reduce-popup-info {
  background: #F8FAFC;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.reduce-popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.reduce-popup-label {
  font-size: 26rpx;
  color: #64748B;
}

.reduce-popup-value {
  font-size: 26rpx;
  font-weight: 500;
  color: #1E293B;
}

.reduce-popup-warning {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #FFFBEB;
  border-radius: 12rpx;
  margin-bottom: 28rpx;
}

.reduce-popup-warning-text {
  font-size: 22rpx;
  color: #B45309;
}

.reduce-popup-actions {
  display: flex;
  justify-content: center;
  gap: 24rpx;
}

.text-safe {
  color: #22C55E;
}

.text-danger {
  color: #EF4444;
}
</style>
