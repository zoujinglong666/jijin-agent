import type { Fund, ActionRecord, RiskHistory, UserBehaviorLog, EmotionHistory, PortfolioSnapshot } from '@/types'

const STORAGE_KEYS = {
  FUNDS: 'fg_funds',
  ACTIONS: 'fg_actions',
  RISK_HISTORY: 'fg_risk_history',
  BEHAVIOR_LOGS: 'fg_behavior_logs',
  EMOTION_HISTORY: 'fg_emotion_history',
  PORTFOLIO_SNAPSHOTS: 'fg_portfolio_snapshots',
  SETTINGS: 'fg_settings',
  ACCOUNTS: 'fg_accounts',
  CURRENT_ACCOUNT: 'fg_current_account',
  ALERT_DISMISSALS: 'fg_alert_dismissals',
  GROWTH_METRICS: 'fg_growth_metrics',
  LLM_MODEL: 'fg_llm_model',
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = uni.getStorageSync(key)
    return data ? JSON.parse(data) : defaultValue
  } catch {
    return defaultValue
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage write failed:', e)
  }
}

export function getFunds(accountId?: string): Fund[] {
  const funds = getStorage<Fund[]>(STORAGE_KEYS.FUNDS, [])
  if (accountId) {
    return funds.filter(f => f.accountId === accountId)
  }
  return funds
}

export function addFund(fund: Omit<Fund, 'id' | 'createTime' | 'updateTime'>): Fund {
  const funds = getFunds()
  const newFund: Fund = {
    ...fund,
    id: generateId(),
    createTime: Date.now(),
    updateTime: Date.now(),
  }
  funds.push(newFund)
  setStorage(STORAGE_KEYS.FUNDS, funds)
  return newFund
}

export function updateFund(id: string, updates: Partial<Fund>): Fund | null {
  const funds = getFunds()
  const index = funds.findIndex(f => f.id === id)
  if (index === -1) return null
  funds[index] = { ...funds[index], ...updates, updateTime: Date.now() }
  setStorage(STORAGE_KEYS.FUNDS, funds)
  return funds[index]
}

export function deleteFund(id: string): boolean {
  const funds = getFunds()
  const filtered = funds.filter(f => f.id !== id)
  if (filtered.length === funds.length) return false
  setStorage(STORAGE_KEYS.FUNDS, filtered)
  return true
}

export function getActions(fundId?: string): ActionRecord[] {
  const actions = getStorage<ActionRecord[]>(STORAGE_KEYS.ACTIONS, [])
  if (fundId) {
    return actions.filter(a => a.fundId === fundId)
  }
  return actions
}

export function addAction(action: Omit<ActionRecord, 'id' | 'createTime'>): ActionRecord {
  const actions = getActions()
  const newAction: ActionRecord = {
    ...action,
    id: Date.now(),
    createTime: Date.now(),
  }
  actions.push(newAction)
  setStorage(STORAGE_KEYS.ACTIONS, actions)
  return newAction
}

export function getRiskHistory(limit?: number): RiskHistory[] {
  const history = getStorage<RiskHistory[]>(STORAGE_KEYS.RISK_HISTORY, [])
  const sorted = history.sort((a, b) => b.createTime - a.createTime)
  return limit ? sorted.slice(0, limit) : sorted
}

export function addRiskHistory(score: number, snapshotJson: string): RiskHistory {
  const history = getRiskHistory()
  const newRecord: RiskHistory = {
    id: Date.now(),
    riskScore: score,
    snapshotJson,
    createTime: Date.now(),
  }
  history.push(newRecord)
  setStorage(STORAGE_KEYS.RISK_HISTORY, history)
  return newRecord
}

export function getBehaviorLogs(limit?: number): UserBehaviorLog[] {
  const logs = getStorage<UserBehaviorLog[]>(STORAGE_KEYS.BEHAVIOR_LOGS, [])
  const sorted = logs.sort((a, b) => b.eventTime - a.eventTime)
  return limit ? sorted.slice(0, limit) : sorted
}

export function addBehaviorLog(eventType: UserBehaviorLog['eventType'], payload: string = ''): UserBehaviorLog {
  const logs = getStorage<UserBehaviorLog[]>(STORAGE_KEYS.BEHAVIOR_LOGS, [])
  const newLog: UserBehaviorLog = {
    id: Date.now(),
    eventType,
    eventTime: Date.now(),
    payload,
  }
  logs.push(newLog)
  setStorage(STORAGE_KEYS.BEHAVIOR_LOGS, logs)
  return newLog
}

export function getRecentBehaviorCount(eventType: UserBehaviorLog['eventType'], hours: number): number {
  const logs = getBehaviorLogs()
  const cutoff = Date.now() - hours * 60 * 60 * 1000
  return logs.filter(l => l.eventType === eventType && l.eventTime >= cutoff).length
}

export function getEmotionHistory(limit?: number): EmotionHistory[] {
  const history = getStorage<EmotionHistory[]>(STORAGE_KEYS.EMOTION_HISTORY, [])
  const sorted = history.sort((a, b) => b.createTime - a.createTime)
  return limit ? sorted.slice(0, limit) : sorted
}

export function addEmotionHistory(score: number): EmotionHistory {
  const history = getStorage<EmotionHistory[]>(STORAGE_KEYS.EMOTION_HISTORY, [])
  const newRecord: EmotionHistory = {
    id: Date.now(),
    emotionScore: score,
    createTime: Date.now(),
  }
  history.push(newRecord)
  setStorage(STORAGE_KEYS.EMOTION_HISTORY, history)
  return newRecord
}

export function getPortfolioSnapshots(limit?: number): PortfolioSnapshot[] {
  const snapshots = getStorage<PortfolioSnapshot[]>(STORAGE_KEYS.PORTFOLIO_SNAPSHOTS, [])
  const sorted = snapshots.sort((a, b) => b.createTime - a.createTime)
  return limit ? sorted.slice(0, limit) : sorted
}

export function addPortfolioSnapshot(snapshotJson: string): PortfolioSnapshot {
  const snapshots = getStorage<PortfolioSnapshot[]>(STORAGE_KEYS.PORTFOLIO_SNAPSHOTS, [])
  const newSnapshot: PortfolioSnapshot = {
    id: Date.now(),
    snapshotJson,
    createTime: Date.now(),
  }
  snapshots.push(newSnapshot)
  setStorage(STORAGE_KEYS.PORTFOLIO_SNAPSHOTS, snapshots)
  return newSnapshot
}

export function getSettings(): import('@/types').UserSettings {
  return getStorage<import('@/types').UserSettings>(STORAGE_KEYS.SETTINGS, {
    riskPreference: 'balanced',
    dailyReportEnabled: true,
    behaviorTrackingEnabled: true,
    cloudSyncEnabled: false,
  })
}

export function updateSettings(updates: Partial<import('@/types').UserSettings>): import('@/types').UserSettings {
  const settings = getSettings()
  const updated = { ...settings, ...updates }
  setStorage(STORAGE_KEYS.SETTINGS, updated)
  return updated
}

export function getLlmModel(): string {
  return getStorage<string>(STORAGE_KEYS.LLM_MODEL, 'deepseek-v4-pro')
}

export function updateLlmModel(modelId: string): string {
  setStorage(STORAGE_KEYS.LLM_MODEL, modelId)
  return modelId
}

export function getAccounts(): import('@/types').AccountInfo[] {
  return getStorage<import('@/types').AccountInfo[]>(STORAGE_KEYS.ACCOUNTS, [
    {
      id: 'default',
      name: '主账户',
      type: 'main',
      icon: '💰',
      createTime: Date.now(),
    },
  ])
}

export function getCurrentAccountId(): string {
  return getStorage<string>(STORAGE_KEYS.CURRENT_ACCOUNT, 'default')
}

export function setCurrentAccountId(id: string): void {
  setStorage(STORAGE_KEYS.CURRENT_ACCOUNT, id)
}

export function addAccount(account: Omit<import('@/types').AccountInfo, 'id' | 'createTime'>): import('@/types').AccountInfo {
  const accounts = getAccounts()
  const newAccount: import('@/types').AccountInfo = {
    ...account,
    id: generateId(),
    createTime: Date.now(),
  }
  accounts.push(newAccount)
  setStorage(STORAGE_KEYS.ACCOUNTS, accounts)
  return newAccount
}

export function getDismissedAlerts(): string[] {
  return getStorage<string[]>(STORAGE_KEYS.ALERT_DISMISSALS, [])
}

export function dismissAlert(alertId: string): void {
  const dismissed = getDismissedAlerts()
  if (!dismissed.includes(alertId)) {
    dismissed.push(alertId)
    setStorage(STORAGE_KEYS.ALERT_DISMISSALS, dismissed)
  }
}

export function getGrowthMetrics(): import('@/types').GrowthMetrics {
  return getStorage<import('@/types').GrowthMetrics>(STORAGE_KEYS.GROWTH_METRICS, {
    stableDays: 0,
    riskControlRate: 0,
    emotionStability: 0,
    longTermHoldIndex: 0,
  })
}

export function updateGrowthMetrics(updates: Partial<import('@/types').GrowthMetrics>): import('@/types').GrowthMetrics {
  const metrics = getGrowthMetrics()
  const updated = { ...metrics, ...updates }
  setStorage(STORAGE_KEYS.GROWTH_METRICS, updated)
  return updated
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      uni.removeStorageSync(key)
    } catch (e) {
      console.error('Failed to remove:', key, e)
    }
  })
}
