export interface Fund {
  id: string;
  name: string;
  code: string;
  amount: number;
  profitRate: number;
  sector: string;
  createTime: number;
  updateTime: number;
  accountId?: string;
}

export interface ActionRecord {
  id: number;
  fundId: string;
  actionType: 'reduce' | 'add' | 'rebalance';
  ratio: number;
  reason: string;
  createTime: number;
}

export interface RiskSnapshot {
  score: number;
  level: 'safe' | 'warning' | 'danger';
  sectorConcentration: number;
  marketVolatility: number;
  behaviorScore: number;
  eventImpact: number;
  timestamp: number;
}

export interface BehaviorState {
  score: number;
  level: 'calm' | 'alert' | 'anxious' | 'panic';
  openFrequency: number;
  refreshFrequency: number;
  portfolioViewCount: number;
  simulateActionCount: number;
  lastEventTime: number;
}

export type BehaviorEvent = 'APP_OPEN' | 'PORTFOLIO_VIEW' | 'REFRESH' | 'FUND_VIEW' | 'SIMULATE_SELL' | 'ADD_POSITION' | 'EDIT_POSITION' | 'REDUCE_POSITION';

export interface EmotionState {
  score: number;
  level: 'stable' | 'neutral' | 'anxious' | 'panic';
  trend: 'improving' | 'stable' | 'worsening';
}

export interface NewsEvent {
  id: string;
  title: string;
  content: string;
  source: string;
  relatedSectors: string[];
  impactLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface AgentContext {
  userId: string;
  portfolio: Fund[];
  behavior: BehaviorState;
  emotion: EmotionState;
  marketEvents: NewsEvent[];
  risk: RiskSnapshot;
}

export interface AgentOutput {
  insight: string;
  riskExplanation: string;
  behaviorInsight: string;
  emotionInsight: string;
  shouldNotify: boolean;
  importance: number;
}

export interface MemoryRecord {
  id: string;
  userId: string;
  type: 'behavior' | 'emotion' | 'risk' | 'portfolio_snapshot';
  data: string;
  timestamp: number;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 encoded images for multimodal input
}

export interface LlmResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  sector: string;
  dropPercent: number;
  isCustom: boolean;
}

export interface StressTestResult {
  scenario: StressTestScenario;
  portfolioDrop: number;
  lossAmount: number;
  sectorContributions: { sector: string; contribution: number }[];
}

export const HIGH_VOLATILITY_SECTORS = ['半导体', 'AI', '新能源', '港股', '美股'];

export const SECTOR_LIST = ['半导体', 'AI', '新能源', '医药', '消费', '红利', '债券', '黄金', '港股', '美股', '现金', '其他'];

export interface LlmModelConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  description: string;
  tag: string;
  tagColor: string;
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
];
