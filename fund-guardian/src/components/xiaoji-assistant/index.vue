<template>
  <view class="xiaoji-assistant">
    <!-- 悬浮按钮 -->
    <view v-if="!isOpen" class="fab-button" @tap="toggleOpen">
      <view v-if="unreadCount > 0" class="fab-badge">{{ unreadCount }}</view>
      <wd-icon name="chat" size="24px" color="#FFFFFF"></wd-icon>
    </view>

    <!-- 对话面板 -->
    <view v-if="isOpen" class="chat-panel">
      <view class="panel-header">
        <view class="panel-header-left">
          <view class="panel-avatar"><wd-icon name="chat" size="16px" color="#FFF"></wd-icon></view>
          <view class="panel-title-wrap">
            <text class="panel-title">小基助手</text>
            <text class="panel-subtitle">专业、理性、有温度</text>
          </view>
        </view>
        <view class="panel-header-right">
          <view class="panel-btn" @tap="clearChat"><wd-icon name="delete" size="18px" color="#94A3B8"></wd-icon></view>
          <view class="panel-btn" @tap="toggleOpen"><wd-icon name="close" size="18px" color="#94A3B8"></wd-icon></view>
        </view>
      </view>

      <scroll-view class="message-area" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
        <!-- 欢迎 -->
        <view v-if="messages.length === 0" class="welcome-area">
          <view class="welcome-avatar"><wd-icon name="chat" size="36px" color="#6B7FD7"></wd-icon></view>
          <text class="welcome-text">你好，我是小基！</text>
          <text class="welcome-sub">专业基金分析，理性投资陪伴</text>
          <view class="quick-list">
            <view v-for="(q, i) in quickQuestions" :key="i" class="quick-item" @tap="sendQuickQuestion(q)">
              <text class="quick-text">{{ q }}</text>
            </view>
          </view>
        </view>

        <!-- 消息列表 -->
        <view v-for="(msg, i) in messages" :key="i" :class="['msg-row', msg.role === 'user' ? 'msg-right' : 'msg-left']">
          <view v-if="msg.role === 'ai'" class="msg-avatar ai-av"><wd-icon name="chat" size="14px" color="#FFF"></wd-icon></view>
          <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
            <text class="msg-text" :user-select="true">{{ msg.text }}</text>
            <!-- CardRenderer -->
            <template v-if="msg.card && msg.card.type">
              <SingleChoiceCard
                v-if="msg.card.type === 'single_choice'"
                v-bind="msg.card"
                @submit="(v) => handleCardSubmit(i, v)"
                @cancel="handleCardCancel(i)"
              />
              <SingleChoiceCard
                v-else-if="msg.card.type === 'risk_assessment'"
                v-bind="msg.card"
                @submit="(v) => handleCardSubmit(i, v)"
              />
              <MultiChoiceCard
                v-else-if="msg.card.type === 'multi_choice'"
                v-bind="msg.card"
                @submit="(v) => handleCardSubmit(i, v)"
              />
              <SliderCard
                v-else-if="msg.card.type === 'slider'"
                v-bind="msg.card"
                @submit="(v) => handleCardSubmit(i, v)"
              />
              <FundCompareTable
                v-else-if="msg.card.type === 'fund_compare_table'"
                v-bind="msg.card"
              />
              <view v-else class="card-fallback">
                <text class="fallback-q">{{ msg.card.question || '交互卡片' }}</text>
                <text class="fallback-note">当前版本暂不支持该交互组件</text>
              </view>
            </template>
          </view>
        </view>

        <!-- 打字 -->
        <view v-if="isTyping" class="msg-row msg-left">
          <view class="msg-avatar ai-av"><wd-icon name="chat" size="14px" color="#FFF"></wd-icon></view>
          <view class="msg-bubble bubble-ai">
            <view class="typing-dots"><view class="dot"></view><view class="dot"></view><view class="dot"></view></view>
          </view>
        </view>
        <view style="height: 20rpx;"></view>
      </scroll-view>

      <!-- 风险提示 -->
      <view class="disclaimer-bar"><text class="disclaimer-text">投资有风险，内容仅供参考，不构成投资建议</text></view>

      <!-- 输入区 -->
      <view class="input-area">
        <view class="input-row">
          <input v-model="inputText" class="chat-input" placeholder="问小基任何基金问题..." confirm-type="send" @confirm="sendMessage" :adjust-position="true" />
          <view class="send-btn" :class="{ 'send-btn-active': inputText.trim() && !isTyping }" @tap="sendMessage">
            <wd-icon name="arrow-up" size="16px" :color="inputText.trim() && !isTyping ? '#FFFFFF' : '#94A3B8'"></wd-icon>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { chatApi } from '@/services/api'
import { useLlmModelStore } from '@/store'
import SingleChoiceCard from './cards/SingleChoice.vue'
import MultiChoiceCard from './cards/MultiChoice.vue'
import SliderCard from './cards/SliderCard.vue'
import FundCompareTable from './cards/FundCompareTable.vue'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  card: any | null
}

const llmModelStore = useLlmModelStore()
const isOpen = ref(false)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isTyping = ref(false)
const scrollTop = ref(0)
const unreadCount = ref(0)

const quickQuestions = [
  '帮我分析一下我的持仓风险',
  '什么是最大回撤？',
  '我该怎么控制情绪？',
  '基金定投的原理是什么？',
]

function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) { unreadCount.value = 0; nextTick(() => scrollToBottom()) }
}

function clearChat() { messages.value = [] }
function scrollToBottom() { nextTick(() => { scrollTop.value = scrollTop.value + 999 }) }

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  messages.value.push({ role: 'user', text, card: null })
  inputText.value = ''
  isTyping.value = true
  scrollToBottom()

  try {
    const apiMessages = messages.value.map(m => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.role === 'user' ? m.text : JSON.stringify({ text: m.text, card: m.card }),
    }))

    const result = await chatApi.chat(apiMessages, llmModelStore.currentModelId) as any
    const aiData = result || {}
    const text = aiData.text || '抱歉，暂时无法回复，请稍后再试。'
    const card = aiData.card || null

    messages.value.push({ role: 'ai', text, card })
    if (!isOpen.value) unreadCount.value++
  } catch (error: any) {
    const errMsg = error?.message || '请求失败'
    messages.value.push({ role: 'ai', text: errMsg.includes('API Key') ? 'AI服务尚未配置，请联系管理员。' : `抱歉，出了点问题：${errMsg}`, card: null })
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

function sendQuickQuestion(q: string) { inputText.value = q; sendMessage() }

function handleCardSubmit(msgIndex: number, value: any) {
  const msg = messages.value[msgIndex]
  if (!msg) return

  let userText = ''
  if (value.selection) {
    const opt = msg.card?.options?.find((o: any) => o.value === value.selection)
    userText = `用户选择了：${opt?.label || value.selection}`
  } else if (value.selections) {
    const labels = value.selections.map((v: string) => msg.card?.options?.find((o: any) => o.value === v)?.label || v)
    userText = `用户选择了：${labels.join('、')}`
  } else if (value.value !== undefined) {
    userText = `用户选择了：${value.value}${msg.card?.unit || ''}`
  }

  msg.card = null // clear card after selection
  messages.value.push({ role: 'user', text: userText, card: null })
  sendMessage()
}

function handleCardCancel(msgIndex: number) {
  const msg = messages.value[msgIndex]
  if (msg) msg.card = null
  messages.value.push({ role: 'user', text: '跳过', card: null })
  sendMessage()
}
</script>

<style lang="scss" scoped>
.xiaoji-assistant { position: fixed; z-index: 999; }
.fab-button { position: fixed; right: 32rpx; bottom: 120rpx; width: 100rpx; height: 100rpx; border-radius: 50%; background: linear-gradient(135deg, #F97316, #EA580C); display: flex; align-items: center; justify-content: center; box-shadow: 0 8rpx 24rpx rgba(249,115,22,0.35); z-index: 999; &:active { transform: scale(0.92); } }
.fab-badge { position: absolute; top: -4rpx; right: -4rpx; min-width: 32rpx; height: 32rpx; border-radius: 16rpx; background: #EF4444; color: #FFF; font-size: 20rpx; display: flex; align-items: center; justify-content: center; padding: 0 8rpx; }
.chat-panel { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #F8FAFC; z-index: 1000; display: flex; flex-direction: column; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; background: #FFF; border-bottom: 1rpx solid #F1F5F9; padding-top: calc(var(--status-bar-height, 44px) + 24rpx); }
.panel-header-left { display: flex; align-items: center; gap: 20rpx; }
.panel-avatar { width: 64rpx; height: 64rpx; border-radius: 50%; background: linear-gradient(135deg, #6B7FD7, #8B9DC3); display: flex; align-items: center; justify-content: center; }
.panel-title { font-size: 32rpx; font-weight: 600; color: #1E293B; }
.panel-subtitle { font-size: 22rpx; color: #94A3B8; }
.panel-header-right { display: flex; gap: 16rpx; }
.panel-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #F1F5F9; }
.message-area { flex: 1; padding: 24rpx 24rpx 0; overflow-y: auto; }
.welcome-area { display: flex; flex-direction: column; align-items: center; padding-top: 60rpx; }
.welcome-avatar { width: 120rpx; height: 120rpx; border-radius: 50%; background: #EEF0F7; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; }
.welcome-text { font-size: 36rpx; font-weight: 600; color: #1E293B; margin-bottom: 8rpx; }
.welcome-sub { font-size: 26rpx; color: #94A3B8; margin-bottom: 48rpx; }
.quick-list { width: 100%; display: flex; flex-direction: column; gap: 16rpx; }
.quick-item { background: #FFF; border-radius: 20rpx; padding: 24rpx 28rpx; border: 1rpx solid #E2E8F0; }
.quick-text { font-size: 26rpx; color: #6B7FD7; }
.msg-row { display: flex; margin-bottom: 24rpx; align-items: flex-start; }
.msg-right { justify-content: flex-end; }
.msg-left { justify-content: flex-start; gap: 16rpx; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ai-av { background: linear-gradient(135deg, #6B7FD7, #8B9DC3); }
.msg-bubble { max-width: 75%; padding: 20rpx 24rpx; border-radius: 20rpx; word-break: break-all; }
.bubble-user { background: #6B7FD7; color: #FFF; border-bottom-right-radius: 4rpx; }
.bubble-ai { background: #FFF; color: #1E293B; border-bottom-left-radius: 4rpx; border: 1rpx solid #E2E8F0; }
.msg-text { font-size: 28rpx; line-height: 1.7; white-space: pre-wrap; }
.card-fallback { margin-top: 16rpx; padding: 16rpx; background: #FEF2F2; border-radius: 12rpx; }
.fallback-q { font-size: 24rpx; color: #1E293B; display: block; }
.fallback-note { font-size: 22rpx; color: #94A3B8; margin-top: 8rpx; display: block; }
.typing-dots { display: flex; gap: 8rpx; padding: 4rpx 0; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #94A3B8; animation: typing 1.2s infinite; &:nth-child(2) { animation-delay: 0.2s; } &:nth-child(3) { animation-delay: 0.4s; } }
@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1); } }
.disclaimer-bar { padding: 12rpx 32rpx; background: rgba(241,245,249,0.8); text-align: center; }
.disclaimer-text { font-size: 20rpx; color: #94A3B8; }
.input-area { padding: 16rpx 24rpx; padding-bottom: calc(env(safe-area-inset-bottom) + 16rpx); background: #FFF; border-top: 1rpx solid #F1F5F9; }
.input-row { display: flex; align-items: center; gap: 12rpx; }
.chat-input { flex: 1; height: 72rpx; background: #F1F5F9; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.send-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.send-btn-active { background: #6B7FD7; }
</style>