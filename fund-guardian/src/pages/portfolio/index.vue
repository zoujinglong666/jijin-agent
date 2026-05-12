<template>
  <view class="portfolio-page">
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-label">总资产</text>
        <text class="stat-value">{{ formatAmount(totalAmount) }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">基金数量</text>
        <text class="stat-value">{{ fundCount }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">高波动占比</text>
        <text class="stat-value" :class="highVolRatio > 0.5 ? 'text-danger' : 'text-safe'">
          {{ (highVolRatio * 100).toFixed(1) }}%
        </text>
      </view>
    </view>

    <wd-tabs v-model="activeTab" custom-class="portfolio-tabs">
      <wd-tab name="all" title="全部持仓" />
      <wd-tab name="sector" title="主题聚合" />
    </wd-tabs>

    <view v-if="activeTab === 'all'" class="tab-content">
      <view v-if="sortedFunds.length === 0" class="empty-state">
        <wd-icon name="folder-open" size="80rpx" color="#B0BEC5" />
        <text class="empty-text">暂无持仓基金</text>
        <text class="empty-hint">点击右下角按钮添加你的第一只基金</text>
      </view>

      <wd-swipe-action
        v-for="fund in sortedFunds"
        :key="fund.id"
      >
        <view class="fund-card" @click="goToDetail(fund.id)">
          <view class="fund-card-main">
            <view class="fund-info">
              <text class="fund-name">{{ fund.name }}</text>
              <text class="fund-code">{{ fund.code }}</text>
            </view>
            <view class="fund-amount">
              <text class="amount-value">{{ formatAmount(fund.amount) }}</text>
              <text
                class="profit-rate"
                :class="fund.profitRate >= 0 ? 'text-safe' : 'text-danger'"
              >
                {{ fund.profitRate >= 0 ? '+' : '' }}{{ fund.profitRate.toFixed(2) }}%
              </text>
            </view>
          </view>
          <view class="fund-card-footer">
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
        </view>
        <template #right>
          <view class="swipe-delete-btn" @click="confirmDelete(fund)">
            <wd-icon name="delete" size="40rpx" color="#FFFFFF" />
            <text class="swipe-delete-text">删除</text>
          </view>
        </template>
      </wd-swipe-action>
    </view>

    <view v-if="activeTab === 'sector'" class="tab-content">
      <view v-if="Object.keys(sectorGroups).length === 0" class="empty-state">
        <wd-icon name="folder-open" size="80rpx" color="#B0BEC5" />
        <text class="empty-text">暂无持仓基金</text>
        <text class="empty-hint">点击右下角按钮添加你的第一只基金</text>
      </view>

      <view
        v-for="group in sectorGroupList"
        :key="group.sector"
        class="sector-group"
      >
        <view class="sector-header">
          <view class="sector-title-row">
            <wd-tag
              :bg-color="getSectorBgColor(group.sector)"
              :color="getSectorColor(group.sector)"
              size="small"
              plain
              round
            >
              {{ group.sector }}
            </wd-tag>
            <text class="sector-count">{{ group.funds.length }}只</text>
          </view>
          <view class="sector-meta">
            <text class="sector-amount">{{ formatAmount(group.amount) }}</text>
            <text class="sector-ratio">占比 {{ (group.ratio * 100).toFixed(1) }}%</text>
          </view>
        </view>
        <view class="sector-fund-list">
          <view
            v-for="fund in group.funds"
            :key="fund.id"
            class="sector-fund-item"
            @click="goToDetail(fund.id)"
          >
            <view class="sector-fund-info">
              <text class="sector-fund-name">{{ fund.name }}</text>
              <text class="sector-fund-code">{{ fund.code }}</text>
            </view>
            <view class="sector-fund-amount">
              <text class="sector-fund-value">{{ formatAmount(fund.amount) }}</text>
              <text
                class="sector-fund-rate"
                :class="fund.profitRate >= 0 ? 'text-safe' : 'text-danger'"
              >
                {{ fund.profitRate >= 0 ? '+' : '' }}{{ fund.profitRate.toFixed(2) }}%
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="fab-btn" @click="goToAdd">
      <wd-icon name="add" size="48rpx" color="#FFFFFF" />
    </view>

    <wd-popup
      v-model="deletePopupVisible"
      position="center"
      :close-on-click-modal="true"
      custom-style="border-radius: 24rpx; width: 560rpx;"
    >
      <view class="delete-popup">
        <text class="delete-popup-title">确认删除</text>
        <text class="delete-popup-desc">
          确定要删除「{{ deleteTarget?.name }}」吗？删除后数据无法恢复。
        </text>
        <view class="delete-popup-actions">
          <wd-button size="small" plain @click="deletePopupVisible = false">取消</wd-button>
          <wd-button size="small" type="danger" @click="doDelete">确认删除</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFundStore } from '@/store'
import { SECTOR_COLORS } from '@/types'
import type { Fund, SectorType } from '@/types'

const fundStore = useFundStore()
const activeTab = ref<string>('all')
const deletePopupVisible = ref(false)
const deleteTarget = ref<Fund | null>(null)

onShow(async () => {
  await fundStore.loadFunds()
  await fundStore.loadAnalysis()
})

const totalAmount = computed(() => fundStore.totalAmount)
const fundCount = computed(() => fundStore.funds.length)
const highVolRatio = computed(() => fundStore.highVolatilityRatio)

const sortedFunds = computed(() => {
  return [...fundStore.funds].sort((a, b) => b.amount - a.amount)
})

const sectorGroups = computed(() => fundStore.sectorRatios)

const sectorGroupList = computed(() => {
  const groups: { sector: string; amount: number; ratio: number; funds: Fund[] }[] = []
  const ratios = sectorGroups.value
  const sectorFundMap: Record<string, Fund[]> = {}

  fundStore.funds.forEach(f => {
    if (!sectorFundMap[f.sector]) {
      sectorFundMap[f.sector] = []
    }
    sectorFundMap[f.sector].push(f)
  })

  Object.entries(ratios).forEach(([sector, data]) => {
    groups.push({
      sector,
      amount: data.amount,
      ratio: data.ratio,
      funds: (sectorFundMap[sector] || []).sort((a, b) => b.amount - a.amount),
    })
  })

  return groups.sort((a, b) => b.amount - a.amount)
})

function formatAmount(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

function getSectorColor(sector: string): string {
  return SECTOR_COLORS[sector as SectorType] || '#64748B'
}

function getSectorBgColor(sector: string): string {
  const color = SECTOR_COLORS[sector as SectorType] || '#64748B'
  return color + '15'
}

function goToDetail(fundId: string) {
  uni.navigateTo({ url: `/pages/fund-detail/index?fundId=${fundId}` })
}

function goToAdd() {
  uni.navigateTo({ url: '/pages/add-fund/index' })
}

function confirmDelete(fund: Fund) {
  deleteTarget.value = fund
  deletePopupVisible.value = true
}

function doDelete() {
  if (deleteTarget.value) {
    fundStore.deleteFund(deleteTarget.value.id)
    deletePopupVisible.value = false
    deleteTarget.value = null
  }
}
</script>

<style lang="scss" scoped>
.portfolio-page {
  min-height: 100vh;
  background-color: #F8FAFC;
  padding-bottom: 160rpx;
}

.stats-row {
  display: flex;
  padding: 24rpx 32rpx;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 8rpx;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
}

.portfolio-tabs {
  margin: 0 32rpx;
}

.tab-content {
  padding: 16rpx 32rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #94A3B8;
  margin-top: 24rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #B0BEC5;
  margin-top: 12rpx;
}

.fund-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.fund-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.fund-info {
  flex: 1;
  min-width: 0;
}

.fund-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fund-code {
  display: block;
  font-size: 24rpx;
  color: #94A3B8;
  margin-top: 6rpx;
}

.fund-amount {
  text-align: right;
  flex-shrink: 0;
  margin-left: 24rpx;
}

.amount-value {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
}

.profit-rate {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  margin-top: 6rpx;
}

.fund-card-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F1F5F9;
}

.swipe-delete-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  height: 100%;
  background: #EF4444;
  border-radius: 0 20rpx 20rpx 0;
}

.swipe-delete-text {
  font-size: 22rpx;
  color: #FFFFFF;
  margin-top: 4rpx;
}

.sector-group {
  background: #FFFFFF;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.sector-header {
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #F1F5F9;
}

.sector-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sector-count {
  font-size: 24rpx;
  color: #94A3B8;
}

.sector-meta {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 12rpx;
}

.sector-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
}

.sector-ratio {
  font-size: 24rpx;
  color: #94A3B8;
}

.sector-fund-list {
  padding: 0 28rpx;
}

.sector-fund-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;

  &:last-child {
    border-bottom: none;
  }
}

.sector-fund-info {
  flex: 1;
  min-width: 0;
}

.sector-fund-name {
  display: block;
  font-size: 28rpx;
  color: #1E293B;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sector-fund-code {
  display: block;
  font-size: 22rpx;
  color: #94A3B8;
  margin-top: 4rpx;
}

.sector-fund-amount {
  text-align: right;
  flex-shrink: 0;
  margin-left: 24rpx;
}

.sector-fund-value {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1E293B;
}

.sector-fund-rate {
  display: block;
  font-size: 24rpx;
  margin-top: 4rpx;
}

.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: 200rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #6B7FD7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(107, 127, 215, 0.35);
  z-index: 100;
}

.delete-popup {
  padding: 40rpx;
  text-align: center;
}

.delete-popup-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 20rpx;
}

.delete-popup-desc {
  display: block;
  font-size: 28rpx;
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 36rpx;
}

.delete-popup-actions {
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
