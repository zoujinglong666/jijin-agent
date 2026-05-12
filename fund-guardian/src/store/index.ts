import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Fund, RiskAlert, StressTestResult, InvestmentPersonality, BehaviorTag, AccountInfo, UserSettings, GrowthMetrics } from '@/types'
import {
  portfolioApi, behaviorApi, riskApi, regretApi, growthApi, llmApi, authApi, agentApi, setToken as apiSetToken, clearToken as apiClearToken
} from '@/services/api'

export const useFundStore = defineStore('fund', () => {
  const funds = ref<Fund[]>([])
  const totalAmount = ref<number>(0)
  const sectorRatios = ref<Record<string, { ratio: number; amount: number; fundCount: number }>>({})
  const highVolatilityRatio = ref<number>(0)
  const maxSectorConcentration = ref<{ sector: string; ratio: number }>({ sector: '', ratio: 0 })
  const riskAlerts = ref<RiskAlert[]>([])
  const investmentPersonality = ref<InvestmentPersonality | null>(null)
  const behaviorTags = ref<BehaviorTag[]>([])
  const emotionRiskScore = ref<number>(0)
  const cashRatio = ref<number>(0)

  const riskLevel = computed(() => {
    const score = emotionRiskScore.value
    if (score <= 30) return { label: '稳健', color: '#6B7FD7', level: 'safe' }
    if (score <= 60) return { label: '中性', color: '#A855F7', level: 'neutral' }
    if (score <= 80) return { label: '激进', color: '#F97316', level: 'aggressive' }
    return { label: '高风险', color: '#EF4444', level: 'danger' }
  })

  const investmentStyle = computed(() => {
    const score = emotionRiskScore.value
    if (score <= 30) return '稳健保守型'
    if (score <= 60) return '均衡配置型'
    if (score <= 80) return '激进成长型'
    return '高风险投机型'
  })

  async function loadFunds() {
    try {
      const result = await portfolioApi.getFunds() as any
      funds.value = (result || []).map((f: any) => ({
        id: f.id, name: f.name, code: f.code, amount: Number(f.amount),
        profitRate: Number(f.profitRate), sector: f.sector,
        createTime: new Date(f.createdAt || f.createTime).getTime(),
        updateTime: new Date(f.updatedAt || f.updateTime).getTime(),
      }))
    } catch (e) {
      console.error('loadFunds failed:', e)
    }
  }

  async function loadAnalysis() {
    try {
      const [analysisResult, riskResult] = await Promise.all([
        portfolioApi.getAnalysis() as any,
        riskApi.getSnapshot().catch(() => null) as any,
      ])
      totalAmount.value = analysisResult?.totalAmount ?? 0
      sectorRatios.value = analysisResult?.sectorRatios ?? {}
      highVolatilityRatio.value = analysisResult?.highVolatilityRatio ?? 0
      maxSectorConcentration.value = analysisResult?.maxSectorConcentration ?? { sector: '', ratio: 0 }
      if (riskResult) {
        emotionRiskScore.value = riskResult.score ?? 0
      }
      // 计算现金占比
      const cashFunds = (funds.value || []).filter(f => f.sector === '现金')
      cashRatio.value = totalAmount.value > 0 ? cashFunds.reduce((sum, f) => sum + f.amount, 0) / totalAmount.value : 0
    } catch (e) {
      console.error('loadAnalysis failed:', e)
    }
  }

  async function addFund(fund: Omit<Fund, 'id' | 'createTime' | 'updateTime'>) {
    try {
      await portfolioApi.addFund(fund)
      await loadFunds()
      await loadAnalysis()
      behaviorApi.recordEvent('ADD_POSITION').catch(() => {})
    } catch (e) {
      console.error('addFund failed:', e)
      throw e
    }
  }

  async function updateFund(id: string, updates: Partial<Fund>) {
    try {
      await portfolioApi.updateFund(id, updates)
      await loadFunds()
      await loadAnalysis()
      behaviorApi.recordEvent('EDIT_POSITION').catch(() => {})
    } catch (e) {
      console.error('updateFund failed:', e)
      throw e
    }
  }

  async function deleteFund(id: string) {
    try {
      await portfolioApi.deleteFund(id)
      await loadFunds()
      await loadAnalysis()
    } catch (e) {
      console.error('deleteFund failed:', e)
      throw e
    }
  }

  async function loadRiskAlerts() {
    try {
      riskAlerts.value = await riskApi.getAlerts() as any
    } catch (e) {
      console.error('loadRiskAlerts failed:', e)
    }
  }

  async function loadPersonality() {
    try {
      investmentPersonality.value = await behaviorApi.getPersonality() as any
    } catch (e) {
      console.error('loadPersonality failed:', e)
    }
  }

  async function loadBehaviorTags() {
    try {
      behaviorTags.value = await behaviorApi.getTags() as any
    } catch (e) {
      console.error('loadBehaviorTags failed:', e)
    }
  }

  async function runStressTest(scenario: import('@/types').StressTestScenario): Promise<StressTestResult> {
    return riskApi.runStressTest(scenario) as Promise<StressTestResult>
  }

  async function recordReducePosition(fundId: string, ratio: number, reason: string) {
    try {
      await portfolioApi.addAction({ fundId, actionType: 'reduce', ratio, reason })
      behaviorApi.recordEvent('REDUCE_POSITION').catch(() => {})
    } catch (e) {
      console.error('recordReducePosition failed:', e)
    }
  }

  return {
    funds, totalAmount, sectorRatios, highVolatilityRatio, maxSectorConcentration,
    emotionRiskScore, riskAlerts, investmentPersonality, behaviorTags, cashRatio,
    riskLevel, investmentStyle,
    loadFunds, loadAnalysis, addFund, updateFund, deleteFund,
    loadRiskAlerts, loadPersonality, loadBehaviorTags,
    runStressTest, recordReducePosition,
  }
})

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>({
    riskPreference: 'balanced',
    dailyReportEnabled: true,
    behaviorTrackingEnabled: true,
    cloudSyncEnabled: false,
  })

  async function loadSettings() {
    try {
      const profile = await authApi.getProfile() as any
      settings.value = {
        riskPreference: profile.riskPreference || 'balanced',
        dailyReportEnabled: profile.dailyReportEnabled ?? true,
        behaviorTrackingEnabled: profile.behaviorTrackingEnabled ?? true,
        cloudSyncEnabled: profile.cloudSyncEnabled ?? false,
      }
    } catch (e) {
      console.error('loadSettings failed:', e)
    }
  }

  async function updateSettings(updates: Partial<UserSettings>) {
    try {
      await authApi.updateSettings(updates)
      settings.value = { ...settings.value, ...updates }
    } catch (e) {
      console.error('updateSettings failed:', e)
    }
  }

  return { settings, loadSettings, updateSettings }
})

export const useAccountStore = defineStore('account', () => {
  const accounts = ref<AccountInfo[]>([
    { id: 'default', name: '主账户', type: 'main', icon: '💰', createTime: Date.now() },
  ])
  const currentAccountId = ref<string>('default')

  function addAccount(account: Omit<AccountInfo, 'id' | 'createTime'>) {
    const newAccount: AccountInfo = { ...account, id: Date.now().toString(), createTime: Date.now() }
    accounts.value.push(newAccount)
  }

  function setCurrentAccount(id: string) {
    currentAccountId.value = id
  }

  return { accounts, currentAccountId, addAccount, setCurrentAccount }
})

export const useGrowthStore = defineStore('growth', () => {
  const metrics = ref<GrowthMetrics>({ stableDays: 0, riskControlRate: 0, emotionStability: 0, longTermHoldIndex: 0 })

  async function loadMetrics() {
    try {
      const result = await growthApi.getMetrics() as any
      metrics.value = {
        stableDays: result.stableDays ?? 0,
        riskControlRate: Number(result.riskControlRate) ?? 0,
        emotionStability: Number(result.emotionStability) ?? 0,
        longTermHoldIndex: Number(result.longTermHoldIndex) ?? 0,
      }
    } catch (e) {
      console.error('loadMetrics failed:', e)
    }
  }

  async function updateMetrics(updates: Partial<GrowthMetrics>) {
    try {
      await growthApi.updateMetrics(updates)
      metrics.value = { ...metrics.value, ...updates }
    } catch (e) {
      console.error('updateMetrics failed:', e)
    }
  }

  function incrementStableDays() {
    updateMetrics({ stableDays: metrics.value.stableDays + 1 })
  }

  function resetStableDays() {
    updateMetrics({ stableDays: 0 })
  }

  return { metrics, loadMetrics, updateMetrics, incrementStableDays, resetStableDays }
})

export const useAgentStore = defineStore('agent', () => {
  const lastOutput = ref<import('@/types').AgentOutput | null>(null)
  const isRunning = ref(false)
  const agentMessages = ref<Array<{
    id: string
    type: 'agent' | 'system'
    title: string
    content: string
    importance: number
    timestamp: number
  }>>([])

  async function runAgent() {
    if (isRunning.value) return
    isRunning.value = true
    try {
      const output = await agentApi.run() as any
      if (output && output.shouldNotify) {
        lastOutput.value = output
        agentMessages.value.unshift({
          id: Date.now().toString(),
          type: 'agent',
          title: output.insight,
          content: output.riskExplanation,
          importance: output.importance,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('Agent run failed:', error)
    } finally {
      isRunning.value = false
    }
  }

  async function recordBehaviorEvent(event: string) {
    try {
      await behaviorApi.recordEvent(event)
    } catch (error) {
      console.error('Behavior event record failed:', error)
    }
  }

  function dismissMessage(id: string) {
    agentMessages.value = agentMessages.value.filter(m => m.id !== id)
  }

  return { lastOutput, isRunning, agentMessages, runAgent, recordBehaviorEvent, dismissMessage }
})

export const useLlmModelStore = defineStore('llmModel', () => {
  const currentModelId = ref<string>('deepseek-v4-pro')
  const availableModels = ref<import('@/types').LlmModelConfig[]>([])

  const currentModel = computed(() => {
    return availableModels.value.find(m => m.id === currentModelId.value) || availableModels.value[0]
  })

  async function loadModels() {
    try {
      availableModels.value = await llmApi.getModels() as any
    } catch (e) {
      console.error('loadModels failed:', e)
    }
  }

  async function loadCurrentModel() {
    try {
      const result = await llmApi.getCurrentModel() as any
      currentModelId.value = result?.modelId || 'deepseek-v4-pro'
    } catch (e) {
      console.error('loadCurrentModel failed:', e)
    }
  }

  async function setModel(modelId: string) {
    try {
      await llmApi.setModel(modelId)
      currentModelId.value = modelId
    } catch (e) {
      console.error('setModel failed:', e)
    }
  }

  return { currentModelId, availableModels, currentModel, loadModels, loadCurrentModel, setModel }
})

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(uni.getStorageSync('fg_auth_token') || '')
  const user = ref<{ id: string; email: string; riskPreference?: string } | null>(null)
  const isLoggedIn = computed(() => !!token.value)

  async function login(email: string, password: string) {
    const result = await authApi.login(email, password) as any
    token.value = result.token
    user.value = result.user
    apiSetToken(result.token)
  }

  async function register(email: string, password: string) {
    const result = await authApi.register(email, password) as any
    token.value = result.token
    user.value = result.user
    apiSetToken(result.token)
  }

  async function fetchProfile() {
    try {
      const profile = await authApi.getProfile() as any
      user.value = { id: profile.id, email: profile.email, riskPreference: profile.riskPreference }
    } catch {
      // token might be expired
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    apiClearToken()
  }

  function init() {
    if (token.value && !user.value) {
      fetchProfile()
    }
  }

  return { token, user, isLoggedIn, login, register, fetchProfile, logout, init }
})