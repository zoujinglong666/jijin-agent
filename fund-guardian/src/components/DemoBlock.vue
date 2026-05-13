<template>
  <view
    class="demo-block"
    :class="[
      transparent ? 'demo-block--transparent' : '',
      card ? 'demo-block--card' : ''
    ]"
    :style="{ padding: padding }"
  >
    <view v-if="title" class="demo-block__title">
      {{ title }}
    </view>
    <view class="demo-block__content">
      <slot></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  transparent?: boolean
  card?: boolean
  padding?: string
}

const props = withDefaults(defineProps<Props>(), {
  transparent: false,
  card: false,
  padding: '32rpx'
})

// 组件配置
defineOptions({
  addGlobalClass: true,
  virtualHost: true,
  options: {
    styleIsolation: 'shared'
  }
})
</script>

<style lang="scss" scoped>
.demo-block {
  background-color: #FFFFFF;
  border-radius: 16rpx;
  margin: 32rpx 0;
  padding: 32rpx;

  &--transparent {
    background-color: transparent;
    padding: 0;
  }

  &--card {
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  }

  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: #1E293B;
    margin-bottom: 24rpx;
  }

  &__content {
    width: 100%;
  }
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
  .demo-block {
    background-color: #1E293B;

    &__title {
      color: #F8FAFC;
    }
  }
}
</style>