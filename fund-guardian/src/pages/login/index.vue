<template>
  <view class="login-page">
    <view class="header">
      <view class="logo-wrap">
        <wd-icon name="shield-check" size="48px" color="#6B7FD7"></wd-icon>
      </view>
      <text class="title">基金守护</text>
      <text class="subtitle">理性投资，情绪守护</text>
    </view>

    <view class="form-card">
      <wd-tabs v-model="activeTab" custom-class="login-tabs">
        <wd-tab name="login" title="登录" />
        <wd-tab name="register" title="注册" />
      </wd-tabs>

      <view class="form-body">
        <view class="field-wrap">
          <wd-input
            v-model="email"
            placeholder="邮箱地址"
            type="text"
            clearable
            prefix-icon="email"
            :error="!!emailError"
          />
          <text v-if="emailError" class="field-error">{{ emailError }}</text>
        </view>
        <view class="field-wrap">
          <wd-input
            v-model="password"
            placeholder="密码"
            clearable
            show-password
            prefix-icon="lock"
            :error="!!passwordError"
          />
          <text v-if="passwordError" class="field-error">{{ passwordError }}</text>
        </view>
        <view v-if="activeTab === 'register'" class="field-wrap">
          <wd-input
            v-model="confirmPassword"
            placeholder="确认密码"
            clearable
            show-password
            prefix-icon="lock"
            :error="!!confirmError"
          />
          <text v-if="confirmError" class="field-error">{{ confirmError }}</text>
        </view>

        <view v-if="activeTab === 'register'" class="password-hint">
          <text class="hint-text">密码至少8位，需包含字母和数字</text>
        </view>

        <wd-button
          type="primary"
          block
          :loading="loading"
          :disabled="loading"
          @click="handleSubmit"
          custom-style="margin-top: 32rpx; border-radius: 24rpx; background: #6B7FD7; height: 96rpx;"
        >
          {{ activeTab === 'login' ? '登录' : '注册' }}
        </wd-button>
      </view>
    </view>

    <view class="footer">
      <text class="footer-text">登录即表示同意服务条款和隐私政策</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/store'

const authStore = useAuthStore()
const activeTab = ref<string>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const emailError = ref('')
const passwordError = ref('')
const confirmError = ref('')

function validate(): boolean {
  emailError.value = ''
  passwordError.value = ''
  confirmError.value = ''

  if (!email.value.trim()) {
    emailError.value = '请输入邮箱'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    emailError.value = '请输入有效的邮箱地址'
    return false
  }

  if (!password.value) {
    passwordError.value = '请输入密码'
    return false
  }

  if (activeTab.value === 'register') {
    if (password.value.length < 8) {
      passwordError.value = '密码至少8位'
      return false
    }
    if (!/[a-zA-Z]/.test(password.value) || !/\d/.test(password.value)) {
      passwordError.value = '密码需包含字母和数字'
      return false
    }
    if (password.value !== confirmPassword.value) {
      confirmError.value = '两次密码不一致'
      return false
    }
  }

  return true
}

async function handleSubmit() {
  if (!validate()) return
  loading.value = true

  try {
    if (activeTab.value === 'login') {
      await authStore.login(email.value.trim(), password.value)
    } else {
      await authStore.register(email.value.trim(), password.value)
    }
    uni.showToast({ title: activeTab.value === 'login' ? '登录成功' : '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1000)
  } catch (error: any) {
    const msg = error?.message || (activeTab.value === 'login' ? '登录失败' : '注册失败')
    uni.showToast({ title: msg, icon: 'none', duration: 3000 })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
  padding: 0 48rpx;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  margin-bottom: 64rpx;
}

.logo-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #EEF0F7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 12rpx;
}

.subtitle {
  font-size: 26rpx;
  color: #94A3B8;
}

.form-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 32rpx 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}

.login-tabs {
  margin-bottom: 8rpx;
}

.form-body {
  padding-top: 16rpx;
}

.field-wrap {
  margin-bottom: 24rpx;
}

.password-hint {
  margin-top: -12rpx;
  margin-bottom: 8rpx;
}

.hint-text {
  font-size: 22rpx;
  color: #94A3B8;
}

.field-error {
  font-size: 22rpx;
  color: #FA5151;
  margin-top: 4rpx;
  padding-left: 4rpx;
}

.footer {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 80rpx;
}

.footer-text {
  font-size: 22rpx;
  color: #B0BEC5;
}
</style>