<template>
  <view class="card">
    <text class="card-question">{{ question }}</text>
    <text v-if="description" class="card-desc">{{ description }}</text>
    <view class="slider-wrap">
      <view v-if="Object.keys(labels || {}).length" class="label-row">
        <text v-for="(label, val) in labels" :key="val" class="label-item" :style="{ left: ((Number(val) - min) / (max - min) * 100) + '%' }">{{ label }}</text>
      </view>
      <wd-slider
        :model-value="currentValue"
        :min="min"
        :max="max"
        :step="step"
        @change="(e: any) => currentValue = e.value ?? e"
      />
      <view class="value-display">
        <text class="value-text">{{ currentValue }}{{ unit || '' }}</text>
      </view>
    </view>
    <view class="confirm-btn" @tap="confirm">
      <text class="confirm-text">{{ confirmText || '确认' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  question: { type: String, required: true },
  description: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  unit: { type: String, default: '' },
  labels: { type: Object, default: () => ({}) },
  defaultValue: { type: Number, default: null },
  confirmText: { type: String, default: '确认' },
})

const emit = defineEmits(['submit'])
const currentValue = ref(props.defaultValue ?? props.min)

function confirm() {
  emit('submit', { value: currentValue.value })
}
</script>

<style lang="scss" scoped>
.card { padding: 24rpx; background: #F8FAFC; border-radius: 16rpx; border: 1rpx solid #E2E8F0; }
.card-question { font-size: 28rpx; font-weight: 600; color: #1E293B; display: block; }
.card-desc { font-size: 24rpx; color: #64748B; margin-top: 8rpx; display: block; }
.slider-wrap { margin-top: 20rpx; position: relative; padding: 0 8rpx; }
.label-row { position: relative; height: 36rpx; margin-bottom: 8rpx; }
.label-item { position: absolute; transform: translateX(-50%); font-size: 20rpx; color: #94A3B8; white-space: nowrap; }
.value-display { text-align: center; margin-top: 8rpx; }
.value-text { font-size: 32rpx; font-weight: 600; color: #6B7FD7; }
.confirm-btn { margin-top: 20rpx; padding: 16rpx; background: #6B7FD7; border-radius: 12rpx; text-align: center; }
.confirm-text { color: #FFF; font-size: 26rpx; font-weight: 500; }
</style>