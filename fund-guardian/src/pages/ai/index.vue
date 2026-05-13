<template>
  <view class="ai-page">
    <view class="chat-area" :style="{ paddingBottom: keyboardHeight + 'px' }">
      <view v-if="messages.length === 0" class="welcome-section">
        <view class="welcome-icon">
          <CarbonIcon name="chat" size="48" color="#8B9DC3" />
        </view>
        <view class="welcome-title">AI风险助手</view>
        <view class="welcome-desc">安静地帮你分析持仓风险，理性地陪伴你做决策</view>
        <view class="model-badge">
          <text class="model-badge-text">{{ llmModelStore.currentModel.name }}</text>
        </view>
        <view class="quick-questions">
          <view class="quick-label">你可以问我：</view>
          <view
            v-for="(q, i) in quickQuestions"
            :key="i"
            class="quick-btn"
            @tap="sendQuickQuestion(q)"
          >
            <CarbonIcon name="message" size="14" color="#6B7FD7" />
            <text class="quick-btn-text">{{ q }}</text>
          </view>
        </view>
      </view>

      <view v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai']">
        <view v-if="msg.role === 'ai'" class="avatar ai-avatar">
          <CarbonIcon name="chat" size="18" color="#FFFFFF" />
        </view>
        <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
          <text class="msg-text">{{ msg.content }}</text>
          <view v-if="msg.role === 'ai'" class="msg-disclaimer">
            以上内容仅为风险分析参考，不构成投资建议。
          </view>
        </view>
      </view>

      <view v-if="isTyping" class="msg-row msg-row-ai">
        <view class="avatar ai-avatar">
          <CarbonIcon name="chat" size="18" color="#FFFFFF" />
        </view>
        <view class="msg-bubble bubble-ai">
          <view class="typing-dots">
            <view class="dot"></view>
            <view class="dot"></view>
            <view class="dot"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="input-area">
      <view class="input-row">
        <wd-input
          v-model="inputText"
          placeholder="输入你的问题..."
          clearable
          confirm-type="send"
          @confirm="sendMessage"
          custom-style="background: #F1F5F9; border-radius: 24rpx; padding: 12rpx 24rpx;"
        />
        <wd-button
          type="primary"
          size="small"
          :disabled="!inputText.trim() || isTyping"
          @click="sendMessage"
          custom-style="margin-left: 16rpx; border-radius: 24rpx; background: #6B7FD7;"
        >
          发送
        </wd-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLlmModelStore } from '@/store'
import { chatApi } from '@/services/api'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

const llmModelStore = useLlmModelStore()
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isTyping = ref(false)
const keyboardHeight = ref(0)

const quickQuestions = [
  '帮我分析一下我的持仓风险',
  '什么是最大回撤？',
  '我该怎么控制情绪？',
  '基金定投的原理是什么？',
]

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isTyping.value = true

  try {
    const apiMessages = messages.value.map(m => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))

    const result = await chatApi.chat(apiMessages, llmModelStore.currentModelId) as any
    const content = result?.text || result?.content || '抱歉，暂时无法回复，请稍后再试。'
    messages.value.push({ role: 'ai', content })
  } catch (error: any) {
    const errMsg = error?.message || '请求失败'
    if (errMsg.includes('API Key未配置')) {
      messages.value.push({
        role: 'ai',
        content: 'AI服务尚未配置，请联系管理员设置API Key后再试。',
      })
    } else if (errMsg.includes('未授权')) {
      messages.value.push({
        role: 'ai',
        content: '登录已过期，请重新登录后再试。',
      })
    } else {
      messages.value.push({
        role: 'ai',
        content: `抱歉，分析请求出现问题：${errMsg}。请稍后再试。`,
      })
    }
  } finally {
    isTyping.value = false
    nextTick(() => {
      scrollToBottom()
    })
  }
}

function sendQuickQuestion(question: string) {
  inputText.value = question
  sendMessage()
}

function nextTick(fn: () => void) {
  setTimeout(fn, 50)
}

function scrollToBottom() {
  uni.pageScrollTo({ scrollTop: 99999, duration: 300 })
}

uni.onKeyboardHeightChange((res: { height: number }) => {
  keyboardHeight.value = res.height
})
</script>

<style lang="scss" scoped>
.ai-page {
  min-height: 100vh;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
}

.chat-area {
  flex: 1;
  padding: 24rpx 32rpx 200rpx;
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80rpx;
}

.welcome-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #EEF0F7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #1E293B;
  margin-bottom: 16rpx;
}

.welcome-desc {
  font-size: 26rpx;
  color: #94A3B8;
  margin-bottom: 48rpx;
}

.model-badge {
  display: inline-flex;
  background: #EEF0F7;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
  margin-bottom: 48rpx;
}

.model-badge-text {
  font-size: 22rpx;
  color: #6B7FD7;
  font-weight: 500;
}

.quick-questions {
  width: 100%;
}

.quick-label {
  font-size: 24rpx;
  color: #94A3B8;
  margin-bottom: 20rpx;
  padding-left: 8rpx;
}

.quick-btn {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s;
}

.quick-btn:active {
  background: #F1F5F9;
  transform: scale(0.98);
}

.quick-btn-text {
  font-size: 26rpx;
  color: #475569;
  margin-left: 16rpx;
  line-height: 1.5;
}

.msg-row {
  display: flex;
  margin-bottom: 28rpx;
  align-items: flex-start;
}

.msg-row-user {
  justify-content: flex-end;
}

.msg-row-ai {
  justify-content: flex-start;
}

.avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-avatar {
  background: #8B9DC3;
  margin-right: 16rpx;
}

.msg-bubble {
  max-width: 75%;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  line-height: 1.7;
}

.bubble-user {
  background: #6B7FD7;
  border-top-right-radius: 6rpx;
}

.bubble-user .msg-text {
  color: #FFFFFF;
  font-size: 28rpx;
}

.bubble-ai {
  background: #FFFFFF;
  border-top-left-radius: 6rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.bubble-ai .msg-text {
  color: #334155;
  font-size: 28rpx;
  white-space: pre-line;
}

.msg-disclaimer {
  font-size: 22rpx;
  color: #94A3B8;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #F1F5F9;
  line-height: 1.5;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 0;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #94A3B8;
  animation: dotPulse 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes dotPulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  z-index: 100;
}

.input-row {
  display: flex;
  align-items: center;
}
</style>