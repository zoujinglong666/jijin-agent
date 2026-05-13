<template>
  <view class="card single-choice">
    <view class="card-header">
      <text class="card-question">{{ question }}</text>
      <text v-if="description" class="card-desc">{{ description }}</text>
    </view>
    <view class="card-options">
      <view
        v-for="opt in options"
        :key="opt.value"
        class="option-btn"
        :class="{ selected: selected === opt.value }"
        @tap="selected = opt.value"
      >
        <text v-if="opt.icon" class="opt-icon">{{ opt.icon }}</text>
        <view class="opt-text">
          <text class="opt-label">{{ opt.label }}</text>
          <text v-if="opt.description" class="opt-desc">{{ opt.description }}</text>
        </view>
      </view>
    </view>
    <view class="card-actions">
      <view class="confirm-btn" :class="{ disabled: !selected }" @tap="confirm">
        <text class="confirm-text">{{ confirmText || '确认' }}</text>
      </view>
      <view v-if="cancelText" class="cancel-btn" @tap="cancel">
        <text class="cancel-text">{{ cancelText }}</text>
      </view>
    </view>
    <text v-if="contextNote" class="card-note">{{ contextNote }}</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  question: { type: String, required: true },
  description: { type: String, default: '' },
  options: { type: Array as () => { label: string; value: string; icon?: string; description?: string }[], required: true },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '' },
  contextNote: { type: String, default: '' },
})

const emit = defineEmits(['submit', 'cancel'])
const selected = ref<string | null>(null)

function confirm() {
  if (selected.value) emit('submit', { selection: selected.value })
}

function cancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.card { padding: 24rpx; background: #F8FAFC; border-radius: 16rpx; border: 1rpx solid #E2E8F0; }
.card-question { font-size: 28rpx; font-weight: 600; color: #1E293B; display: block; }
.card-desc { font-size: 24rpx; color: #64748B; margin-top: 8rpx; display: block; }
.card-options { margin-top: 20rpx; display: flex; flex-direction: column; gap: 12rpx; }
.option-btn { padding: 20rpx 24rpx; background: #FFF; border: 2rpx solid #E2E8F0; border-radius: 12rpx; display: flex; align-items: center; gap: 16rpx; transition: all 0.2s; }
.option-btn.selected { border-color: #6B7FD7; background: #EEF0F7; }
.opt-icon { font-size: 32rpx; }
.opt-text { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.opt-label { font-size: 26rpx; color: #1E293B; font-weight: 500; }
.opt-desc { font-size: 22rpx; color: #94A3B8; }
.card-actions { margin-top: 20rpx; display: flex; gap: 16rpx; }
.confirm-btn { flex: 1; padding: 16rpx; background: #6B7FD7; border-radius: 12rpx; text-align: center; }
.confirm-btn.disabled { background: #CBD5E1; }
.confirm-text { color: #FFF; font-size: 26rpx; font-weight: 500; }
.cancel-btn { padding: 16rpx 24rpx; background: #F1F5F9; border-radius: 12rpx; }
.cancel-text { color: #64748B; font-size: 26rpx; }
.card-note { font-size: 22rpx; color: #94A3B8; margin-top: 12rpx; display: block; }

@media (prefers-color-scheme: dark) {
  .card { background: #1E293B; border: 1rpx solid #334155; }
  .card-question { color: #F8FAFC; }
  .card-desc { color: #94A3B8; }
  .option-btn { background: #0F172A; border: 2rpx solid #334155; }
  .option-btn.selected { border-color: #6B7FD7; background: #334155; }
  .opt-label { color: #F8FAFC; }
  .opt-desc { color: #94A3B8; }
  .cancel-btn { background: #334155; }
  .cancel-text { color: #CBD5E1; }
}
</style>