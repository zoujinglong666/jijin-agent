<template>
  <view class="xiaoji-assistant">
    <!-- 悬浮按钮 -->
    <view v-if="!isOpen" class="fab-button" @tap="toggleOpen">
      <view v-if="unreadCount > 0" class="fab-badge">{{ unreadCount }}</view>
      <CarbonIcon name="chat" size="40" color="#FFFFFF" />
    </view>

    <!-- 对话面板 -->
    <view v-if="isOpen" class="chat-panel">
      <view class="panel-header">
        <view class="panel-header-left">
          <view class="panel-avatar"><CarbonIcon name="chat" size="28" color="#FFFFFF" /></view>
          <view class="panel-title-wrap">
            <text class="panel-title">小基助手</text>
            <text class="panel-subtitle">
              {{ isStreaming ? '正在思考...' : '专业、理性、有温度' }}
            </text>
          </view>
        </view>
        <view class="panel-header-right">
          <view class="panel-btn" @tap="clearChat"><CarbonIcon name="delete" size="28" color="#94A3B8" /></view>
          <view class="panel-btn" @tap="toggleOpen"><CarbonIcon name="close" size="28" color="#94A3B8" /></view>
        </view>
      </view>

      <scroll-view class="message-area" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
        <!-- 欢迎 -->
        <view v-if="messages.length === 0" class="welcome-area">
          <view class="welcome-avatar"><CarbonIcon name="chat" size="64" color="#6B7FD7" /></view>
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
          <view v-if="msg.role === 'ai'" class="msg-avatar ai-av"><CarbonIcon name="chat" size="24" color="#FFFFFF" /></view>
          <view :class="['msg-bubble', msg.role === 'user' ? 'bubble-user' : 'bubble-ai']">
            <!-- 用户图片消息 -->
            <view v-if="msg.images && msg.images.length > 0" class="msg-images">
              <image v-for="(img, idx) in msg.images" :key="idx" :src="img" class="msg-image" mode="aspectFill" @tap="previewImage(img)" />
            </view>
            <!-- 文本内容 -->
            <text class="msg-text" :user-select="true">{{ msg.text }}</text>
            <!-- 工具调用指示器 -->
            <view v-if="msg.tools && msg.tools.length > 0" class="tools-indicator">
              <view v-for="tool in msg.tools" :key="tool.name" class="tool-chip">
                <CarbonIcon :name="tool.icon" size="12" :color="tool.color" />
                <text class="tool-name">{{ tool.label }}</text>
              </view>
            </view>
            <!-- 交互卡片 -->
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
            </template>
          </view>
        </view>

        <!-- 流式输出中 -->
        <view v-if="isStreaming" class="msg-row msg-left">
          <view class="msg-avatar ai-av"><CarbonIcon name="chat" size="24" color="#FFFFFF" /></view>
          <view class="msg-bubble bubble-ai">
            <text class="msg-text streaming-text">{{ streamingText }}</text>
            <view v-if="currentTools.length > 0" class="tools-indicator">
              <view v-for="tool in currentTools" :key="tool.name" class="tool-chip in-progress">
                <CarbonIcon :name="tool.icon" size="12" :color="tool.color" />
                <text class="tool-name">{{ tool.label }} 分析中...</text>
              </view>
            </view>
            <view class="streaming-cursor"></view>
          </view>
        </view>

        <view style="height: 20rpx;"></view>
      </scroll-view>

      <!-- 风险提示 -->
      <view class="disclaimer-bar"><text class="disclaimer-text">投资有风险，内容仅供参考，不构成投资建议</text></view>

      <!-- 输入区 -->
      <view class="input-area">
        <!-- 已选图片预览 -->
        <view v-if="selectedImages.length > 0" class="image-preview-bar">
          <view v-for="(img, idx) in selectedImages" :key="idx" class="preview-item">
            <image :src="img" class="preview-img" mode="aspectFill" />
            <view class="preview-remove" @tap="removeImage(idx)">
              <CarbonIcon name="close" size="12" color="#FFFFFF" />
            </view>
          </view>
        </view>
        <view class="input-row">
          <view class="input-left">
            <view class="image-btn" @tap="chooseImage">
              <CarbonIcon name="image" size="24" color="#94A3B8" />
            </view>
            <input 
              v-model="inputText" 
              class="chat-input" 
              placeholder="问小基任何基金问题，或上传图片..." 
              confirm-type="send" 
              @confirm="sendMessage" 
              :adjust-position="true" 
            />
          </view>
          <view class="send-btn" :class="{ 'send-btn-active': canSend }" @tap="sendMessage">
            <CarbonIcon name="forward" size="28" color="#FFFFFF" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { chatApi } from '@/services/api'
import { useLlmModelStore } from '@/store'
import CarbonIcon from '@/components/CarbonIcon.vue'
import SingleChoiceCard from './cards/SingleChoice.vue'
import MultiChoiceCard from './cards/MultiChoice.vue'
import SliderCard from './cards/SliderCard.vue'
import FundCompareTable from './cards/FundCompareTable.vue'

interface ChatMessage {
  role: 'user' | 'ai'
  text: string
  images?: string[]
  card?: any
  tools?: { name: string; label: string; icon: string; color: string }[]
}

const llmModelStore = useLlmModelStore()
const isOpen = ref(false)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isStreaming = ref(false)
const streamingText = ref('')
const scrollTop = ref(0)
const unreadCount = ref(0)
const selectedImages = ref<string[]>([])
const currentTools = ref<{ name: string; label: string; icon: string; color: string }[]>([])

const canSend = computed(() => (inputText.value.trim() || selectedImages.value.length > 0) && !isStreaming.value)

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

// 选择图片
function chooseImage() {
  uni.chooseImage({
    count: 3,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      selectedImages.value = [...selectedImages.value, ...(res.tempFilePaths as string[])].slice(0, 3)
    },
  })
}

function removeImage(index: number) {
  selectedImages.value.splice(index, 1)
}

function previewImage(url: string) {
  uni.previewImage({ urls: [url] })
}

// 将图片转为 Base64
async function imageToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(`data:image/jpeg;base64,${res.data}`),
      fail: reject,
    })
  })
}

// 打字机效果
async function typeWriterEffect(text: string) {
  const chars = text.split('')
  let currentText = ''
  
  for (let i = 0; i < chars.length; i++) {
    currentText += chars[i]
    streamingText.value = currentText
    await new Promise(resolve => setTimeout(resolve, 20)) // 20ms间隔
    scrollToBottom()
  }
}

// 显示工具调用
function showToolCalls(toolCalls: any[]) {
  const toolMap: Record<string, { label: string; icon: string; color: string }> = {
    'analyze_portfolio': { label: '分析持仓', icon: 'chart-pie', color: '#6B7FD7' },
    'check_risk': { label: '风险评估', icon: 'warning', color: '#F97316' },
    'analyze_behavior': { label: '行为诊断', icon: 'user', color: '#8B9DC3' },
    'get_market_news': { label: '市场资讯', icon: 'notification', color: '#22C55E' },
    'compare_funds': { label: '基金对比', icon: 'folder', color: '#A855F7' },
  }
  
  currentTools.value = toolCalls
    .map(tc => toolMap[tc.function?.name || tc.name])
    .filter(Boolean) as { name: string; label: string; icon: string; color: string }[]
}

async function sendMessage() {
  const text = inputText.value.trim()
  const images = [...selectedImages.value]
  
  if ((!text && images.length === 0) || isStreaming.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', text, images: images.length > 0 ? images : undefined })
  inputText.value = ''
  selectedImages.value = []
  scrollToBottom()

  // 开始流式输出
  isStreaming.value = true
  streamingText.value = ''
  currentTools.value = []
  scrollToBottom()

  try {
    // 构建消息历史
    const apiMessages = messages.value.map(m => ({
      role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.role === 'user' 
        ? m.text 
        : JSON.stringify({ text: m.text, card: m.card }),
    }))

    // 如果有图片，需要特殊处理（DeepSeek 多模态支持）
    let imageBase64List: string[] = []
    if (images.length > 0) {
      imageBase64List = await Promise.all(images.map(img => imageToBase64(img)))
    }

    // 调用流式 API
    const response = await fetch('http://localhost:3000/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uni.getStorageSync('fg_auth_token') || ''}`,
      },
      body: JSON.stringify({
        messages: apiMessages,
        modelId: llmModelStore.currentModelId,
        images: imageBase64List,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let currentToolCalls: any[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') continue
        
        try {
          const parsed = JSON.parse(data)
          if (parsed.content) {
            fullText += parsed.content
            
            // 打字机效果：逐字符显示
            typeWriterEffect(fullText)
          }
          if (parsed.tool_calls) {
            // 实时显示工具调用状态
            currentToolCalls = [...currentToolCalls, ...parsed.tool_calls]
            showToolCalls(currentToolCalls)
          }
          if (parsed.error) {
            throw new Error(parsed.error)
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // 解析工具调用标记
    const tools = parseToolCalls(fullText)
    const cleanText = stripToolTags(fullText)

    messages.value.push({ 
      role: 'ai', 
      text: cleanText,
      tools: tools.length > 0 ? tools : undefined,
    })
    if (!isOpen.value) unreadCount.value++
  } catch (error: any) {
    const errMsg = error?.message || '请求失败'
    messages.value.push({ 
      role: 'ai', 
      text: errMsg.includes('API Key') 
        ? 'AI服务尚未配置，请联系管理员。' 
        : `抱歉，出了点问题：${errMsg}`,
    })
  } finally {
    isStreaming.value = false
    streamingText.value = ''
    currentTools.value = []
    scrollToBottom()
  }
}

// 解析工具调用标记
function parseToolCalls(text: string): { name: string; label: string; icon: string; color: string }[] {
  const tools: { name: string; label: string; icon: string; color: string }[] = []
  const toolMap: Record<string, { label: string; icon: string; color: string }> = {
    'analyze_portfolio': { label: '分析持仓', icon: 'chart-pie', color: '#6B7FD7' },
    'check_risk': { label: '风险评估', icon: 'warning', color: '#F97316' },
    'analyze_behavior': { label: '行为诊断', icon: 'user', color: '#8B9DC3' },
    'get_market_news': { label: '市场资讯', icon: 'notification', color: '#22C55E' },
    'compare_funds': { label: '基金对比', icon: 'folder', color: '#A855F7' },
  }
  
  const regex = /\\[TOOL:(\\w+)\\]/g
  let match
  while ((match = regex.exec(text)) !== null) {
    const name = match[1]
    if (toolMap[name]) {
      tools.push({ name, ...toolMap[name] })
    }
  }
  return tools
}

function stripToolTags(text: string): string {
  return text.replace(/\\[TOOL:\\w+\\]/g, '').trim()
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

  msg.card = null
  messages.value.push({ role: 'user', text: userText })
  sendMessage()
}

function handleCardCancel(msgIndex: number) {
  const msg = messages.value[msgIndex]
  if (msg) msg.card = null
  messages.value.push({ role: 'user', text: '跳过' })
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
.msg-left { justify-content: flex-start; }
.msg-avatar { width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 16rpx; }
.ai-av { background: linear-gradient(135deg, #6B7FD7, #8B9DC3); }
.msg-bubble { max-width: calc(75% - 72rpx); padding: 20rpx 24rpx; border-radius: 20rpx; word-break: break-all; }
.bubble-user { background: #6B7FD7; color: #FFF; border-bottom-right-radius: 4rpx; }
.bubble-ai { background: #FFF; color: #1E293B; border-bottom-left-radius: 4rpx; border: 1rpx solid #E2E8F0; }
.msg-text { font-size: 28rpx; line-height: 1.7; white-space: pre-wrap; }

/* 图片消息 */
.msg-images { display: flex; flex-wrap: wrap; gap: 8rpx; margin-bottom: 12rpx; }
.msg-image { width: 160rpx; height: 160rpx; border-radius: 12rpx; object-fit: cover; }

/* 工具调用指示器 */
.tools-indicator { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 12rpx; padding-top: 12rpx; border-top: 1rpx solid #F1F5F9; }
.tool-chip { display: flex; align-items: center; gap: 6rpx; padding: 4rpx 12rpx; background: #F8F9FF; border-radius: 8rpx; }
.tool-chip.in-progress { background: #EEF0F7; animation: pulse 2s infinite; }
.tool-name { font-size: 20rpx; color: #6B7FD7; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }

/* 流式输出光标 */
.streaming-text { display: inline; }
.streaming-cursor { display: inline-block; width: 2rpx; height: 28rpx; background: #6B7FD7; margin-left: 4rpx; animation: blink 1s infinite; vertical-align: middle; }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

/* 图片预览栏 */
.image-preview-bar { display: flex; gap: 12rpx; padding: 12rpx 24rpx; background: #FFF; border-top: 1rpx solid #F1F5F9; }
.preview-item { position: relative; width: 80rpx; height: 80rpx; }
.preview-img { width: 100%; height: 100%; border-radius: 8rpx; object-fit: cover; }
.preview-remove { position: absolute; top: -8rpx; right: -8rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: #EF4444; display: flex; align-items: center; justify-content: center; }

.disclaimer-bar { padding: 12rpx 32rpx; background: rgba(241,245,249,0.8); text-align: center; }
.disclaimer-text { font-size: 20rpx; color: #94A3B8; }
.input-area { padding: 16rpx 24rpx; padding-bottom: calc(env(safe-area-inset-bottom) + 16rpx); background: #FFF; border-top: 1rpx solid #F1F5F9; }
.input-row { display: flex; align-items: center; gap: 12rpx; }
.input-left { flex: 1; display: flex; align-items: center; gap: 12rpx; }
.image-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #F1F5F9; flex-shrink: 0; }
.chat-input { flex: 1; height: 72rpx; background: #F1F5F9; border-radius: 36rpx; padding: 0 28rpx; font-size: 28rpx; }
.send-btn { width: 64rpx; height: 64rpx; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0; }
.send-btn-active { background: #6B7FD7; }

@media (prefers-color-scheme: dark) {
  .chat-panel { background: #0F172A; }
  .panel-header { background: #1E293B; border-bottom: 1rpx solid #334155; }
  .panel-btn { background: #334155; }
  .bubble-ai { background: #1E293B; border: 1rpx solid #334155; color: #F8FAFC; }
  .quick-item { background: #1E293B; border: 1rpx solid #334155; }
  .quick-text { color: #94A3B8; }
  .disclaimer-bar { background: rgba(30,41,59,0.8); }
  .disclaimer-text { color: #64748B; }
  .input-area { background: #1E293B; border-top: 1rpx solid #334155; }
  .chat-input { background: #334155; color: #F8FAFC; }
  .image-btn { background: #334155; }
  .tool-chip { background: #1E293B; }
  .tool-chip.in-progress { background: #334155; }
}
</style>