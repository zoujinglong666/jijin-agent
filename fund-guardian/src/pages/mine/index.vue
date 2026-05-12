<template>
  <view class="mine-page">
    <view class="user-section">
      <view class="user-card">
        <view class="avatar-wrap">
          <wd-icon name="user" size="32px" color="#8B9DC3"></wd-icon>
        </view>
        <view class="user-info">
          <text class="user-name">{{ authStore.user?.email || '基金守护者' }}</text>
          <text class="user-desc">{{ authStore.isLoggedIn ? '已登录' : '理性投资，安静守护' }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <wd-icon name="shield" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">风险偏好</text>
      </view>
      <view class="card">
        <view class="risk-options">
          <view
            v-for="opt in riskOptions"
            :key="opt.value"
            :class="['risk-option', settings.riskPreference === opt.value ? 'risk-option-active' : '']"
            @tap="setRiskPreference(opt.value)"
          >
            <view class="risk-option-icon" :style="{ background: opt.bgColor }">
              <wd-icon :name="opt.icon" size="20px" :color="opt.color"></wd-icon>
            </view>
            <view class="risk-option-text">
              <text class="risk-option-label">{{ opt.label }}</text>
              <text class="risk-option-desc">{{ opt.desc }}</text>
            </view>
            <view v-if="settings.riskPreference === opt.value" class="risk-option-check">
              <wd-icon name="check" size="16px" color="#6B7FD7"></wd-icon>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <wd-icon name="wallet" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">多账户管理</text>
      </view>
      <view class="card">
        <view
          v-for="account in accounts"
          :key="account.id"
          :class="['account-item', currentAccountId === account.id ? 'account-item-active' : '']"
          @tap="switchAccount(account.id)"
        >
          <view class="account-icon-wrap">
            <text class="account-icon">{{ account.icon }}</text>
          </view>
          <view class="account-info">
            <text class="account-name">{{ account.name }}</text>
            <text class="account-type">{{ getAccountTypeLabel(account.type) }}</text>
          </view>
          <view v-if="currentAccountId === account.id" class="account-current">
            <wd-tag type="primary" plain size="small" custom-style="border-radius: 8rpx;">当前</wd-tag>
          </view>
        </view>

        <view class="add-account-btn" @tap="showAddAccount = true">
          <wd-icon name="add" size="16px" color="#6B7FD7"></wd-icon>
          <text class="add-account-text">添加新账户</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <wd-icon name="chat" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">AI 模型</text>
      </view>
      <view class="card">
        <view class="api-key-section">
          <view class="api-key-header" @tap="showApiKeyPopup = true">
            <view class="api-key-left">
              <wd-icon name="lock" size="16px" :color="llmModelStore.hasApiKey ? '#22C55E' : '#FA5151'"></wd-icon>
              <text class="api-key-label">API Key</text>
            </view>
            <view class="api-key-right">
              <text v-if="llmModelStore.hasApiKey" class="api-key-value">{{ llmModelStore.maskedApiKey }}</text>
              <text v-else class="api-key-empty">未设置</text>
              <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
            </view>
          </view>
          <view v-if="llmModelStore.hasApiKey" class="api-key-status">
            <view class="status-dot status-dot-ok"></view>
            <text class="status-text status-text-ok">已配置</text>
          </view>
          <view v-else class="api-key-status">
            <view class="status-dot status-dot-warn"></view>
            <text class="status-text status-text-warn">请设置您的 API Key 以使用 AI 功能</text>
          </view>
        </view>
        <view class="model-current">
          <view class="model-current-info">
            <text class="model-current-name">{{ llmModelStore.currentModel.name }}</text>
            <text class="model-current-desc">{{ llmModelStore.currentModel.description }}</text>
          </view>
          <view v-if="llmModelStore.currentModel.tag" class="model-tag" :style="{ background: llmModelStore.currentModel.tagColor + '18', color: llmModelStore.currentModel.tagColor }">
            {{ llmModelStore.currentModel.tag }}
          </view>
        </view>
        <view class="model-list">
          <view
            v-for="model in llmModelStore.availableModels"
            :key="model.id"
            :class="['model-item', llmModelStore.currentModelId === model.id ? 'model-item-active' : '']"
            @tap="switchModel(model.id)"
          >
            <view class="model-item-radio">
              <view :class="['radio-dot', llmModelStore.currentModelId === model.id ? 'radio-dot-active' : '']"></view>
            </view>
            <view class="model-item-info">
              <view class="model-item-top">
                <text class="model-item-name">{{ model.name }}</text>
                <view v-if="model.tag" class="model-item-tag" :style="{ background: model.tagColor + '18', color: model.tagColor }">
                  {{ model.tag }}
                </view>
              </view>
              <text class="model-item-desc">{{ model.description }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <wd-popup v-model="showApiKeyPopup" position="bottom" custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom));">
      <view class="popup-title">设置 API Key</view>
      <view class="api-key-hint">
        <wd-icon name="info" size="14px" color="#6B7FD7"></wd-icon>
        <text class="api-key-hint-text">您的 API Key 将加密存储，仅用于调用 AI 模型</text>
      </view>
      <view v-if="llmModelStore.hasApiKey" class="current-key-info">
        <text class="current-key-label">当前 Key：</text>
        <text class="current-key-value">{{ llmModelStore.maskedApiKey }}</text>
      </view>
      <view class="form-item">
        <text class="form-label">{{ llmModelStore.hasApiKey ? '新 API Key（留空则保持不变）' : 'API Key' }}</text>
        <wd-input
          v-model="apiKeyInput"
          placeholder="请输入您的 DeepSeek API Key"
          clearable
          show-password
          custom-style="background: #F1F5F9; border-radius: 16rpx; padding: 16rpx 24rpx;"
        />
      </view>
      <view class="form-item">
        <text class="form-label">获取方式</text>
        <view class="key-steps">
          <text class="key-step">1. 访问 platform.deepseek.com</text>
          <text class="key-step">2. 注册/登录账号</text>
          <text class="key-step">3. 在 API Keys 页面创建新 Key</text>
        </view>
      </view>
      <view class="api-key-btns">
        <wd-button
          plain
          @click="showApiKeyPopup = false"
          custom-style="border-radius: 20rpx; flex: 1; margin-right: 16rpx; height: 88rpx;"
        >
          取消
        </wd-button>
        <wd-button
          type="primary"
          :loading="apiKeySaving"
          :disabled="apiKeySaving || (!llmModelStore.hasApiKey && !apiKeyInput.trim())"
          @click="saveApiKey"
          custom-style="border-radius: 20rpx; flex: 1; background: #6B7FD7; height: 88rpx;"
        >
          保存
        </wd-button>
      </view>
    </wd-popup>

    <view class="section">
      <view class="section-header">
        <wd-icon name="setting" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">数据管理</text>
      </view>
      <view class="card">
        <view class="setting-item" @tap="exportData">
          <view class="setting-left">
            <wd-icon name="download" size="18px" color="#64748B"></wd-icon>
            <text class="setting-label">导出数据</text>
          </view>
          <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
        </view>
        <view class="setting-item" @tap="showClearConfirm = true">
          <view class="setting-left">
            <wd-icon name="delete" size="18px" color="#C48282"></wd-icon>
            <text class="setting-label" style="color: #C48282;">清除所有数据</text>
          </view>
          <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <wd-icon name="lock" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">隐私设置</text>
      </view>
      <view class="card">
        <view class="setting-item">
          <view class="setting-left">
            <wd-icon name="view" size="18px" color="#64748B"></wd-icon>
            <text class="setting-label">行为追踪</text>
          </view>
          <wd-switch
            v-model="behaviorTracking"
            size="20px"
            active-color="#6B7FD7"
            @change="onBehaviorTrackingChange"
          />
        </view>
        <view class="setting-item">
          <view class="setting-left">
            <wd-icon name="notification" size="18px" color="#64748B"></wd-icon>
            <text class="setting-label">每日晚报</text>
          </view>
          <wd-switch
            v-model="dailyReport"
            size="20px"
            active-color="#6B7FD7"
            @change="onDailyReportChange"
          />
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <wd-icon name="info" size="16px" color="#6B7FD7"></wd-icon>
        <text class="section-title">关于产品</text>
      </view>
      <view class="card">
        <view class="setting-item">
          <view class="setting-left">
            <wd-icon name="computer" size="18px" color="#64748B"></wd-icon>
            <text class="setting-label">版本信息</text>
          </view>
          <text class="setting-value">2.0.0</text>
        </view>
        <view class="setting-item" @tap="showRiskDisclaimer = true">
          <view class="setting-left">
            <wd-icon name="warning" size="18px" color="#C4A882"></wd-icon>
            <text class="setting-label" style="color: #C4A882;">风险声明</text>
          </view>
          <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
        </view>
        <view class="setting-item" @tap="showUserAgreement = true">
          <view class="setting-left">
            <wd-icon name="notes" size="18px" color="#64748B"></wd-icon>
            <text class="setting-label">用户协议</text>
          </view>
          <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
        </view>
        <view v-if="authStore.isLoggedIn" class="setting-item" @tap="handleLogout">
          <view class="setting-left">
            <wd-icon name="logout" size="18px" color="#C48282"></wd-icon>
            <text class="setting-label" style="color: #C48282;">退出登录</text>
          </view>
          <wd-icon name="arrow-right" size="14px" color="#CBD5E1"></wd-icon>
        </view>
      </view>
    </view>

    <view class="disclaimer-banner">
      <wd-icon name="warning" size="14px" color="#C4A882"></wd-icon>
      <text class="disclaimer-text">本产品不构成投资建议，不承诺收益，不提供交易服务</text>
    </view>

    <wd-popup v-model="showAddAccount" position="bottom" custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom));">
      <view class="popup-title">添加新账户</view>
      <view class="form-item">
        <text class="form-label">账户名称</text>
        <wd-input v-model="newAccountName" placeholder="请输入账户名称" clearable custom-style="background: #F1F5F9; border-radius: 16rpx; padding: 16rpx 24rpx;" />
      </view>
      <view class="form-item">
        <text class="form-label">账户类型</text>
        <view class="type-options">
          <view
            v-for="t in accountTypes"
            :key="t.value"
            :class="['type-option', newAccountType === t.value ? 'type-option-active' : '']"
            @tap="newAccountType = t.value"
          >
            <text class="type-option-icon">{{ t.icon }}</text>
            <text class="type-option-label">{{ t.label }}</text>
          </view>
        </view>
      </view>
      <wd-button
        type="primary"
        block
        :disabled="!newAccountName.trim()"
        @click="addNewAccount"
        custom-style="margin-top: 32rpx; border-radius: 20rpx; background: #6B7FD7; height: 88rpx;"
      >
        确认添加
      </wd-button>
    </wd-popup>

    <wd-popup v-model="showClearConfirm" position="center" custom-style="border-radius: 24rpx; padding: 40rpx 32rpx; width: 560rpx;">
      <view class="confirm-title">确认清除数据</view>
      <view class="confirm-desc">此操作将清除所有持仓、记录和设置数据，且不可恢复。确定要继续吗？</view>
      <view class="confirm-btns">
        <wd-button size="small" plain @click="showClearConfirm = false" custom-style="border-radius: 16rpx; flex: 1; margin-right: 16rpx;">
          取消
        </wd-button>
        <wd-button size="small" type="danger" @click="clearAllData" custom-style="border-radius: 16rpx; flex: 1;">
          确认清除
        </wd-button>
      </view>
    </wd-popup>

    <wd-popup v-model="showRiskDisclaimer" position="bottom" custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); max-height: 70vh;">
      <view class="popup-title">风险声明</view>
      <view class="disclaimer-content">
        <view class="disclaimer-block">
          <text class="disclaimer-block-text">本产品仅提供基金持仓分析、风险提示与行为记录功能。所有内容不构成投资建议，不承诺收益，不提供任何证券基金交易服务。</text>
        </view>
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">数据来源</text>
          <text class="disclaimer-block-text">本产品所有数据均由用户手动输入，不连接任何外部数据源或交易系统。分析结果仅基于用户输入的数据计算得出。</text>
        </view>
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">分析局限性</text>
          <text class="disclaimer-block-text">风险指数、情绪分析等功能仅为辅助参考工具，不构成对基金未来表现的预测或保证。投资决策应基于个人风险承受能力和独立判断。</text>
        </view>
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">免责条款</text>
          <text class="disclaimer-block-text">使用本产品产生的任何投资损失，本产品不承担任何责任。用户应充分了解基金投资的风险，并根据自身情况做出审慎决策。</text>
        </view>
      </view>
      <wd-button type="primary" block @click="showRiskDisclaimer = false" custom-style="margin-top: 24rpx; border-radius: 20rpx; background: #6B7FD7; height: 88rpx;">
        我已了解
      </wd-button>
    </wd-popup>

    <wd-popup v-model="showUserAgreement" position="bottom" custom-style="border-radius: 32rpx 32rpx 0 0; padding: 40rpx 32rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); max-height: 70vh;">
      <view class="popup-title">用户协议</view>
      <view class="disclaimer-content">
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">服务内容</text>
          <text class="disclaimer-block-text">基金守护者是一款基金持仓风险分析工具，提供持仓分析、风险提示、行为记录等功能。本应用不提供任何证券交易服务。</text>
        </view>
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">用户责任</text>
          <text class="disclaimer-block-text">用户应确保输入数据的真实性，并对基于本应用分析结果做出的投资决策自行承担责任。</text>
        </view>
        <view class="disclaimer-block">
          <text class="disclaimer-block-title">隐私保护</text>
          <text class="disclaimer-block-text">所有数据仅存储在用户本地设备，不上传至任何服务器。用户可随时导出或清除数据。</text>
        </view>
      </view>
      <wd-button type="primary" block @click="showUserAgreement = false" custom-style="margin-top: 24rpx; border-radius: 20rpx; background: #6B7FD7; height: 88rpx;">
        我已了解
      </wd-button>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore, useAccountStore, useLlmModelStore, useAuthStore } from '@/store'
import { portfolioApi } from '@/services/api'

const settingsStore = useSettingsStore()
const accountStore = useAccountStore()
const llmModelStore = useLlmModelStore()
const authStore = useAuthStore()

const settings = computed(() => settingsStore.settings)
const accounts = computed(() => accountStore.accounts)
const currentAccountId = computed(() => accountStore.currentAccountId)

const showAddAccount = ref(false)
const showClearConfirm = ref(false)
const showRiskDisclaimer = ref(false)
const showUserAgreement = ref(false)
const newAccountName = ref('')
const newAccountType = ref<AccountInfo['type']>('main')

const showApiKeyPopup = ref(false)
const apiKeyInput = ref('')
const apiKeySaving = ref(false)

const behaviorTracking = ref(settings.value.behaviorTrackingEnabled)
const dailyReport = ref(settings.value.dailyReportEnabled)

interface AccountInfo {
  type: 'main' | 'long_term' | 'high_risk' | 'dca' | 'family'
}

const riskOptions = [
  { value: 'conservative' as const, label: '保守型', desc: '追求稳健，优先保本', icon: 'shield', color: '#8B9DC3', bgColor: '#EEF0F7' },
  { value: 'balanced' as const, label: '平衡型', desc: '兼顾收益与安全', icon: 'balance', color: '#A8B5D1', bgColor: '#EEF0F7' },
  { value: 'aggressive' as const, label: '激进型', desc: '追求高收益，承受高波动', icon: 'trend', color: '#C4A882', bgColor: '#F5EFE5' },
]

const accountTypes = [
  { value: 'main' as const, label: '主账户', icon: '💰' },
  { value: 'long_term' as const, label: '长期投资', icon: '📈' },
  { value: 'high_risk' as const, label: '高风险', icon: '🔥' },
  { value: 'dca' as const, label: '定投账户', icon: '🔄' },
  { value: 'family' as const, label: '家庭账户', icon: '👨‍👩‍👧' },
]

function setRiskPreference(value: 'conservative' | 'balanced' | 'aggressive') {
  settingsStore.updateSettings({ riskPreference: value })
}

function switchAccount(id: string) {
  accountStore.setCurrentAccount(id)
}

function switchModel(modelId: string) {
  llmModelStore.setModel(modelId)
  uni.showToast({ title: '模型已切换', icon: 'success' })
}

async function saveApiKey() {
  if (!apiKeyInput.value.trim() && !llmModelStore.hasApiKey) return
  apiKeySaving.value = true
  try {
    if (apiKeyInput.value.trim()) {
      await llmModelStore.setApiKey(apiKeyInput.value.trim())
      uni.showToast({ title: 'API Key 保存成功', icon: 'success' })
    }
    apiKeyInput.value = ''
    showApiKeyPopup.value = false
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    apiKeySaving.value = false
  }
}

function addNewAccount() {
  if (!newAccountName.value.trim()) return
  const typeInfo = accountTypes.find(t => t.value === newAccountType.value)
  accountStore.addAccount({
    name: newAccountName.value.trim(),
    type: newAccountType.value,
    icon: typeInfo?.icon || '💰',
  })
  newAccountName.value = ''
  newAccountType.value = 'main'
  showAddAccount.value = false
}

function onBehaviorTrackingChange(val: boolean) {
  settingsStore.updateSettings({ behaviorTrackingEnabled: val })
}

function onDailyReportChange(val: boolean) {
  settingsStore.updateSettings({ dailyReportEnabled: val })
}

function getAccountTypeLabel(type: string): string {
  const map: Record<string, string> = {
    main: '主账户',
    long_term: '长期投资',
    high_risk: '高风险',
    dca: '定投账户',
    family: '家庭账户',
  }
  return map[type] || type
}

onMounted(() => {
  settingsStore.loadSettings()
  llmModelStore.loadModels()
  llmModelStore.loadCurrentModel()
  llmModelStore.loadApiKey()
})

function exportData() {
  uni.showToast({ title: '数据导出功能开发中', icon: 'none' })
}

function clearAllData() {
  showClearConfirm.value = false
  uni.showToast({ title: '数据已清除', icon: 'success' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/home/index' })
  }, 1500)
}

function handleLogout() {
  authStore.logout()
  uni.showToast({ title: '已退出登录', icon: 'success' })
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' })
  }, 1000)
}
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  background: #F8FAFC;
  padding-bottom: 40rpx;
}

.user-section {
  padding: 32rpx;
}

.user-card {
  background: linear-gradient(135deg, #8B9DC3 0%, #6B7FD7 100%);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
}

.avatar-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 34rpx;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

.section {
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding-left: 4rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1E293B;
}

.risk-options {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.risk-option {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.risk-option-active {
  border-color: #6B7FD7;
  background: #F8F9FF;
}

.risk-option-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.risk-option-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.risk-option-label {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
  margin-bottom: 4rpx;
}

.risk-option-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

.risk-option-check {
  margin-left: 12rpx;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
}

.account-item:last-of-type {
  border-bottom: none;
}

.account-item-active {
  background: #F8F9FF;
  margin: 0 -16rpx;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  border-bottom: none;
}

.account-icon-wrap {
  margin-right: 20rpx;
}

.account-icon {
  font-size: 36rpx;
}

.account-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.account-name {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.account-type {
  font-size: 22rpx;
  color: #94A3B8;
  margin-top: 4rpx;
}

.account-current {
  margin-left: 12rpx;
}

.api-key-section {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F1F5F9;
  margin-bottom: 8rpx;
}

.api-key-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.api-key-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.api-key-label {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.api-key-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.api-key-value {
  font-size: 24rpx;
  color: #64748B;
  font-family: monospace;
}

.api-key-empty {
  font-size: 24rpx;
  color: #FA5151;
}

.api-key-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.status-dot-ok {
  background: #22C55E;
}

.status-dot-warn {
  background: #FA5151;
}

.status-text {
  font-size: 22rpx;
}

.status-text-ok {
  color: #22C55E;
}

.status-text-warn {
  color: #FA5151;
}

.api-key-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 24rpx;
  padding: 16rpx 20rpx;
  background: #F8F9FF;
  border-radius: 12rpx;
}

.api-key-hint-text {
  font-size: 24rpx;
  color: #6B7FD7;
}

.current-key-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
  padding: 16rpx 20rpx;
  background: #F1F5F9;
  border-radius: 12rpx;
}

.current-key-label {
  font-size: 24rpx;
  color: #64748B;
}

.current-key-value {
  font-size: 24rpx;
  color: #334155;
  font-family: monospace;
}

.api-key-btns {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.key-steps {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #F1F5F9;
  border-radius: 12rpx;
}

.key-step {
  font-size: 24rpx;
  color: #64748B;
  line-height: 1.6;
}

.model-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F1F5F9;
  margin-bottom: 8rpx;
}

.model-current-info {
  display: flex;
  flex-direction: column;
}

.model-current-name {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 600;
  margin-bottom: 4rpx;
}

.model-current-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

.model-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.model-list {
  display: flex;
  flex-direction: column;
}

.model-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
  transition: all 0.2s;
}

.model-item:last-child {
  border-bottom: none;
}

.model-item-active {
  background: #F8F9FF;
  margin: 0 -16rpx;
  padding: 20rpx 16rpx;
  border-radius: 12rpx;
  border-bottom: none;
}

.model-item-radio {
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  border: 2rpx solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.radio-dot-active {
  border-color: #6B7FD7;
  background: #6B7FD7;
  position: relative;
}

.radio-dot-active::after {
  content: '';
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #FFFFFF;
}

.model-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.model-item-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.model-item-name {
  font-size: 28rpx;
  color: #1E293B;
  font-weight: 500;
}

.model-item-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.model-item-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

.add-account-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  margin-top: 12rpx;
  border-top: 1rpx dashed #E2E8F0;
}

.add-account-text {
  font-size: 26rpx;
  color: #6B7FD7;
  margin-left: 8rpx;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F8FAFC;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.setting-label {
  font-size: 28rpx;
  color: #334155;
}

.setting-value {
  font-size: 26rpx;
  color: #94A3B8;
}

.disclaimer-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 24rpx 32rpx;
  margin: 0 32rpx;
  background: #FDF8F0;
  border-radius: 16rpx;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #C4A882;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 28rpx;
  text-align: center;
}

.form-item {
  margin-bottom: 24rpx;
}

.form-label {
  font-size: 26rpx;
  color: #64748B;
  margin-bottom: 12rpx;
  display: block;
}

.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-option {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: #F1F5F9;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.type-option-active {
  border-color: #6B7FD7;
  background: #F8F9FF;
}

.type-option-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.type-option-label {
  font-size: 24rpx;
  color: #334155;
}

.confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1E293B;
  text-align: center;
  margin-bottom: 20rpx;
}

.confirm-desc {
  font-size: 26rpx;
  color: #64748B;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.confirm-btns {
  display: flex;
  gap: 16rpx;
}

.disclaimer-content {
  max-height: 50vh;
  overflow-y: auto;
}

.disclaimer-block {
  margin-bottom: 24rpx;
}

.disclaimer-block-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1E293B;
  margin-bottom: 8rpx;
  display: block;
}

.disclaimer-block-text {
  font-size: 26rpx;
  color: #64748B;
  line-height: 1.7;
}
</style>
