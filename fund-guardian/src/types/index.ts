export interface Fund {
  id: string
  name: string
  code: string
  amount: number
  profitRate: number
  sector: string
  createTime: number
  updateTime: number
  accountId?: string
}

export interface ActionRecord {
  id: number
  fundId: string
  actionType: 'reduce' | 'add' | 'rebalance'
  ratio: number
  reason: string
  createTime: number
}

export interface RiskHistory {
  id: number
  riskScore: number
  snapshotJson: string
  createTime: number
}

export interface UserBehaviorLog {
  id: number
  eventType: 'view_account' | 'reduce_position' | 'add_position' | 'edit_position' | 'open_app'
  eventTime: number
  payload: string
}

export interface EmotionHistory {
  id: number
  emotionScore: number
  createTime: number
}

export interface PortfolioSnapshot {
  id: number
  snapshotJson: string
  createTime: number
}

export interface RiskAlert {
  id: string
  level: 'high' | 'medium' | 'low'
  title: string
  content: string
  sector?: string
  dismissed: boolean
  createTime: number
}

export interface StressTestScenario {
  id: string
  name: string
  description: string
  sector: string
  dropPercent: number
  isCustom: boolean
}

export interface StressTestResult {
  scenario: StressTestScenario
  portfolioDrop: number
  lossAmount: number
  sectorContributions: { sector: string; contribution: number }[]
}

export interface InvestmentPersonality {
  type: string
  label: string
  description: string
  traits: string[]
  score: number
}

export interface BehaviorTag {
  id: string
  label: string
  description: string
  triggered: boolean
  triggerCondition: string
}

export interface AccountInfo {
  id: string
  name: string
  type: 'main' | 'long_term' | 'high_risk' | 'dca' | 'family'
  icon: string
  createTime: number
}

export interface UserSettings {
  riskPreference: 'conservative' | 'balanced' | 'aggressive'
  dailyReportEnabled: boolean
  behaviorTrackingEnabled: boolean
  cloudSyncEnabled: boolean
}

export interface DailyReport {
  date: string
  totalVolatility: number
  maxVolatilitySource: string
  riskScore: number
  emotionState: string
  hasImpulsiveAction: boolean
  summary: string
}

export interface GrowthMetrics {
  stableDays: number
  riskControlRate: number
  emotionStability: number
  longTermHoldIndex: number
}

export interface AgentOutput {
  shouldNotify: boolean
  insight: string
  riskExplanation: string
  behaviorInsight?: string
  importance: number
}

export type SectorType = '半导体' | 'AI' | '新能源' | '医药' | '消费' | '红利' | '债券' | '黄金' | '港股' | '美股' | '现金' | '其他'

export interface LlmModelConfig {
  id: string
  name: string
  provider: string
  model: string
  baseUrl: string
  description: string
  tag: string
  tagColor: string
}

export const LLM_MODELS: LlmModelConfig[] = [
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    baseUrl: 'https://api.deepseek.com',
    description: '最新旗舰模型，Agent与推理能力领先',
    tag: '推荐',
    tagColor: '#6B7FD7',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
    description: '轻量快速版，响应速度更快',
    tag: '快速',
    tagColor: '#22C55E',
  },
  {
    id: 'deepseek-r1-0528',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    model: 'deepseek-r1-0528',
    baseUrl: 'https://api.deepseek.com',
    description: '深度推理模型，擅长复杂逻辑分析',
    tag: '深度推理',
    tagColor: '#F59E0B',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    description: '经典对话模型，稳定可靠',
    tag: '',
    tagColor: '',
  },
]

export const HIGH_VOLATILITY_SECTORS: SectorType[] = ['半导体', 'AI', '新能源', '港股', '美股']

export const SECTOR_LIST: SectorType[] = ['半导体', 'AI', '新能源', '医药', '消费', '红利', '债券', '黄金', '港股', '美股', '现金', '其他']

export const SECTOR_COLORS: Record<SectorType, string> = {
  '半导体': '#6B7FD7',
  'AI': '#A855F7',
  '新能源': '#22C55E',
  '医药': '#F59E0B',
  '消费': '#EC4899',
  '红利': '#EF4444',
  '债券': '#06B6D4',
  '黄金': '#FBBF24',
  '港股': '#F97316',
  '美股': '#3B82F6',
  '现金': '#94A3B8',
  '其他': '#64748B',
}
