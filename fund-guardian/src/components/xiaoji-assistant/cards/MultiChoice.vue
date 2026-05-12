<template>
  <view class="card">
    <text class="card-question">{{ question }}</text>
    <text v-if="description" class="card-desc">{{ description }}</text>
    <view class="chips">
      <view
        v-for="opt in options"
        :key="opt.value"
        class="chip"
        :class="{ active: selected.includes(opt.value) }"
        @tap="toggle(opt.value)"
      >
        <text v-if="opt.icon" class="chip-icon">{{ opt.icon }}</text>
        <text class="chip-label">{{ opt.label }}</text>
      </view>
    </view>
    <view class="confirm-btn" :class="{ disabled: !selected.length }" @tap="confirm">
      <text class="confirm-text">{{ confirmText || '确认' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  question: { type: String, required: true },
  description: { type: String, default: '' },
  options: { type: Array as () => { label: string; value: string; icon?: string }[], required: true },
  confirmText: { type: String, default: '确认' },
})

const emit = defineEmits(['submit'])
const selected = ref<string[]>([])

function toggle(value: string) {
  const idx = selected.value.indexOf(value)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(value)
}

function confirm() {
  if (selected.value.length) emit('submit', { selections: selected.value })
}
</script>

<style lang="scss" scoped>
.card { padding: 24rpx; background: #F8FAFC; border-radius: 16rpx; border: 1rpx solid #E2E8F0; }
.card-question { font-size: 28rpx; font-weight: 600; color: #1E293B; display: block; }
.card-desc { font-size: 24rpx; color: #64748B; margin-top: 8rpx; display: block; }
.chips { margin-top: 20rpx; display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip { display: inline-flex; align-items: center; gap: 8rpx; padding: 12rpx 20rpx; background: #FFF; border: 2rpx solid #E2E8F0; border-radius: 32rpx; }
.chip.active { border-color: #6B7FD7; background: #EEF0F7; }
.chip-icon { font-size: 28rpx; }
.chip-label { font-size: 24rpx; color: #1E293B; }
.confirm-btn { margin-top: 20rpx; padding: 16rpx; background: #6B7FD7; border-radius: 12rpx; text-align: center; }
.confirm-btn.disabled { background: #CBD5E1; }
.confirm-text { color: #FFF; font-size: 26rpx; font-weight: 500; }
</style>