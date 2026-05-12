<template>
  <view class="card">
    <text class="card-title">{{ title }}</text>
    <scroll-view scroll-x class="table-scroll">
      <view class="table">
        <view class="table-header">
          <view class="th th-name">基金名称</view>
          <view v-for="m in metrics" :key="m" class="th">{{ metricLabel(m) }}</view>
        </view>
        <view
          v-for="(fund, idx) in funds"
          :key="idx"
          class="table-row"
          :class="{ highlight: isHighlight(fund) }"
        >
          <view class="td td-name">
            <text class="fund-name">{{ fund.name }}</text>
            <text class="fund-code">{{ fund.code }}</text>
          </view>
          <view v-for="m in metrics" :key="m" class="td">
            <text class="td-val">{{ fund[m as keyof typeof fund] }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
    <text v-if="footnote" class="footnote">{{ footnote }}</text>
  </view>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, default: '基金对比' },
  funds: { type: Array as () => Record<string, any>[], default: () => [] },
  metrics: { type: Array as () => string[], default: () => [] },
  highlightField: { type: String, default: '' },
  footnote: { type: String, default: '' },
})

const emit = defineEmits(['submit'])

function metricLabel(key: string): string {
  const map: Record<string, string> = {
    annualReturn: '年化回报',
    maxDrawdown: '最大回撤',
    sharpe: '夏普比率',
    size: '规模',
  }
  return map[key] || key
}

function isHighlight(fund: any): boolean {
  if (!props.highlightField || !props.funds?.length) return false
  const vals = (props.funds as Record<string, any>[]).map(f => parseFloat(f[props.highlightField]) || 0)
  return parseFloat((fund as Record<string, any>)[props.highlightField]) === Math.max(...vals)
}
</script>

<style lang="scss" scoped>
.card { padding: 24rpx; background: #F8FAFC; border-radius: 16rpx; border: 1rpx solid #E2E8F0; }
.card-title { font-size: 28rpx; font-weight: 600; color: #1E293B; display: block; margin-bottom: 16rpx; }
.table-scroll { width: 100%; }
.table { min-width: 100%; }
.table-header { display: flex; background: #EEF0F7; border-radius: 8rpx; }
.th { flex: 1; padding: 12rpx 16rpx; font-size: 22rpx; color: #64748B; font-weight: 500; text-align: center; }
.th-name { flex: 1.5; text-align: left; }
.table-row { display: flex; border-bottom: 1rpx solid #F1F5F9; }
.table-row.highlight { background: #F0FDF4; }
.td { flex: 1; padding: 16rpx; text-align: center; }
.td-name { flex: 1.5; text-align: left; }
.fund-name { font-size: 24rpx; color: #1E293B; font-weight: 500; display: block; }
.fund-code { font-size: 20rpx; color: #94A3B8; }
.td-val { font-size: 24rpx; color: #334155; }
.footnote { font-size: 20rpx; color: #94A3B8; margin-top: 12rpx; display: block; }
</style>