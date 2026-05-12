import type { Fund, RiskAlert, StressTestScenario, StressTestResult, InvestmentPersonality, BehaviorTag, SectorType } from '@/types'
import { HIGH_VOLATILITY_SECTORS, SECTOR_COLORS } from '@/types'
import { getFunds, getBehaviorLogs, getRecentBehaviorCount, getActions } from './database'

export function calculateTotalAmount(funds: Fund[]): number {
  return funds.reduce((sum, f) => sum + f.amount, 0)
}

export function calculateSectorRatios(funds: Fund[]): Record<string, { ratio: number; amount: number; fundCount: number }> {
  const total = calculateTotalAmount(funds)
  if (total === 0) return {}

  const sectorMap: Record<string, { amount: number; fundCount: number }> = {}
  funds.forEach(f => {
    if (!sectorMap[f.sector]) {
      sectorMap[f.sector] = { amount: 0, fundCount: 0 }
    }
    sectorMap[f.sector].amount += f.amount
    sectorMap[f.sector].fundCount += 1
  })

  const result: Record<string, { ratio: number; amount: number; fundCount: number }> = {}
  Object.entries(sectorMap).forEach(([sector, data]) => {
    result[sector] = {
      ratio: data.amount / total,
      amount: data.amount,
      fundCount: data.fundCount,
    }
  })

  return result
}

export function calculateHighVolatilityRatio(funds: Fund[]): number {
  const total = calculateTotalAmount(funds)
  if (total === 0) return 0

  const highVolAmount = funds
    .filter(f => HIGH_VOLATILITY_SECTORS.includes(f.sector as SectorType))
    .reduce((sum, f) => sum + f.amount, 0)

  return highVolAmount / total
}

export function calculateCashRatio(funds: Fund[]): number {
  const total = calculateTotalAmount(funds)
  if (total === 0) return 0

  const cashAmount = funds
    .filter(f => f.sector === '现金')
    .reduce((sum, f) => sum + f.amount, 0)

  return cashAmount / total
}

export function getMaxSectorConcentration(funds: Fund[]): { sector: string; ratio: number } {
  const ratios = calculateSectorRatios(funds)
  let maxSector = ''
  let maxRatio = 0

  Object.entries(ratios).forEach(([sector, data]) => {
    if (data.ratio > maxRatio) {
      maxSector = sector
      maxRatio = data.ratio
    }
  })

  return { sector: maxSector, ratio: maxRatio }
}

export function getDuplicateSectorFunds(funds: Fund[]): Record<string, number> {
  const sectorCount: Record<string, number> = {}
  funds.forEach(f => {
    sectorCount[f.sector] = (sectorCount[f.sector] || 0) + 1
  })
  const duplicates: Record<string, number> = {}
  Object.entries(sectorCount).forEach(([sector, count]) => {
    if (count >= 2) {
      duplicates[sector] = count
    }
  })
  return duplicates
}

export function calculateEmotionRiskScore(funds: Fund[]): number {
  const maxConcentration = getMaxSectorConcentration(funds)
  const highVolRatio = calculateHighVolatilityRatio(funds)
  const duplicates = getDuplicateSectorFunds(funds)
  const maxDuplicateCount = Math.max(...Object.values(duplicates), 0)

  const viewCount = getRecentBehaviorCount('view_account', 24)

  const concentrationScore = Math.min(maxConcentration.ratio * 100, 100)
  const volatilityScore = highVolRatio * 100
  const duplicateScore = Math.min(maxDuplicateCount * 20, 100)
  const viewScore = Math.min(viewCount * 5, 100)

  const totalScore =
    concentrationScore * 0.35 +
    volatilityScore * 0.30 +
    duplicateScore * 0.20 +
    viewScore * 0.15

  return Math.round(Math.min(totalScore, 100))
}

export function getRiskLevel(score: number): { label: string; color: string; level: string } {
  if (score <= 30) return { label: '稳健', color: '#6B7FD7', level: 'safe' }
  if (score <= 60) return { label: '中性', color: '#A855F7', level: 'neutral' }
  if (score <= 80) return { label: '激进', color: '#F97316', level: 'aggressive' }
  return { label: '高风险', color: '#EF4444', level: 'danger' }
}

export function getInvestmentStyle(score: number): string {
  if (score <= 30) return '稳健保守型'
  if (score <= 60) return '均衡配置型'
  if (score <= 80) return '激进成长型'
  return '高风险投机型'
}

export function generateRiskAlerts(funds: Fund[]): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const sectorRatios = calculateSectorRatios(funds)
  const highVolRatio = calculateHighVolatilityRatio(funds)
  const duplicates = getDuplicateSectorFunds(funds)

  Object.entries(sectorRatios).forEach(([sector, data]) => {
    if (data.ratio > 0.4) {
      alerts.push({
        id: `concentration_${sector}`,
        level: 'high',
        title: `${sector}仓位偏高`,
        content: `你的${sector}相关基金占总资产${(data.ratio * 100).toFixed(0)}%。当前主题集中度较高，短期波动可能明显高于普通混合基金。`,
        sector,
        dismissed: false,
        createTime: Date.now(),
      })
    } else if (data.ratio > 0.25) {
      alerts.push({
        id: `concentration_${sector}`,
        level: 'medium',
        title: `${sector}仓位偏高`,
        content: `你的${sector}相关基金占总资产${(data.ratio * 100).toFixed(0)}%，需关注集中度风险。`,
        sector,
        dismissed: false,
        createTime: Date.now(),
      })
    }
  })

  Object.entries(duplicates).forEach(([sector, count]) => {
    if (count >= 3) {
      alerts.push({
        id: `duplicate_${sector}`,
        level: 'medium',
        title: `${sector}重复持仓较多`,
        content: `你持有${count}只${sector}主题基金，它们可能存在较高重叠。`,
        sector,
        dismissed: false,
        createTime: Date.now(),
      })
    }
  })

  if (highVolRatio > 0.7) {
    alerts.push({
      id: 'high_volatility',
      level: 'high',
      title: '高波动资产占比较高',
      content: `当前账户高波动资产占比${(highVolRatio * 100).toFixed(0)}%，波动风险偏高，请关注仓位承受能力。`,
      dismissed: false,
      createTime: Date.now(),
    })
  }

  if (highVolRatio > 0.9) {
    alerts.push({
      id: 'extreme_volatility',
      level: 'high',
      title: '极度偏重高风险资产',
      content: '你的持仓几乎全部为高波动资产，现金和债券占比极低，请关注风险承受能力。',
      dismissed: false,
      createTime: Date.now(),
    })
  }

  const cashRatio = calculateCashRatio(funds)
  if (cashRatio < 0.05 && funds.length > 0) {
    alerts.push({
      id: 'low_cash',
      level: 'low',
      title: '现金占比较低',
      content: '当前现金占比不足5%，应对极端行情的缓冲空间较小。',
      dismissed: false,
      createTime: Date.now(),
    })
  }

  alerts.sort((a, b) => {
    const levelOrder = { high: 0, medium: 1, low: 2 }
    return levelOrder[a.level] - levelOrder[b.level]
  })

  return alerts.slice(0, 3)
}

export function getDefaultStressScenarios(): StressTestScenario[] {
  return [
    {
      id: 'semi_drop_5',
      name: '半导体下跌5%',
      description: '半导体板块短期回调5%',
      sector: '半导体',
      dropPercent: 5,
      isCustom: false,
    },
    {
      id: 'new_energy_drop_8',
      name: '新能源下跌8%',
      description: '新能源板块回调8%',
      sector: '新能源',
      dropPercent: 8,
      isCustom: false,
    },
    {
      id: 'market_crash',
      name: '市场整体回撤',
      description: '沪深300回撤10%',
      sector: '全部',
      dropPercent: 10,
      isCustom: false,
    },
    {
      id: 'tech_flash_crash',
      name: '科技股闪崩',
      description: '半导体-12%',
      sector: '半导体',
      dropPercent: 12,
      isCustom: false,
    },
    {
      id: 'ai_retreat',
      name: 'AI退潮',
      description: 'AI主题-15%',
      sector: 'AI',
      dropPercent: 15,
      isCustom: false,
    },
    {
      id: 'us_stock_crash',
      name: '美股暴跌',
      description: '纳指-10%',
      sector: '美股',
      dropPercent: 10,
      isCustom: false,
    },
  ]
}

export function runStressTest(funds: Fund[], scenario: StressTestScenario): StressTestResult {
  const total = calculateTotalAmount(funds)
  if (total === 0) {
    return {
      scenario,
      portfolioDrop: 0,
      lossAmount: 0,
      sectorContributions: [],
    }
  }

  const sectorRatios = calculateSectorRatios(funds)
  let portfolioDrop = 0
  const sectorContributions: { sector: string; contribution: number }[] = []

  if (scenario.sector === '全部') {
    portfolioDrop = scenario.dropPercent
    Object.entries(sectorRatios).forEach(([sector, data]) => {
      sectorContributions.push({
        sector,
        contribution: data.ratio * scenario.dropPercent,
      })
    })
  } else {
    const sectorRatio = sectorRatios[scenario.sector]?.ratio || 0
    portfolioDrop = sectorRatio * scenario.dropPercent

    sectorContributions.push({
      sector: scenario.sector,
      contribution: portfolioDrop,
    })

    const otherSectors = Object.entries(sectorRatios).filter(
      ([sector]) => sector !== scenario.sector
    )
    otherSectors.forEach(([sector, data]) => {
      const indirectDrop = data.ratio * scenario.dropPercent * 0.3
      if (indirectDrop > 0.1) {
        sectorContributions.push({
          sector,
          contribution: indirectDrop,
        })
        portfolioDrop += indirectDrop
      }
    })
  }

  sectorContributions.sort((a, b) => b.contribution - a.contribution)

  return {
    scenario,
    portfolioDrop: Math.round(portfolioDrop * 100) / 100,
    lossAmount: Math.round(total * portfolioDrop / 100),
    sectorContributions,
  }
}

export function analyzeInvestmentPersonality(funds: Fund[]): InvestmentPersonality {
  const score = calculateEmotionRiskScore(funds)
  const highVolRatio = calculateHighVolatilityRatio(funds)
  const maxConcentration = getMaxSectorConcentration(funds)
  const viewCount = getRecentBehaviorCount('view_account', 168)
  const recentActions = getActions().filter(a => a.createTime > Date.now() - 7 * 24 * 60 * 60 * 1000)

  if (maxConcentration.ratio > 0.6) {
    return {
      type: 'theme_gambler',
      label: '主题赌徒型',
      description: '偏爱单赛道重仓，追求极致收益',
      traits: ['偏爱高成长主题', '容易长期重仓', '对短期波动较敏感', '倾向集中押注'],
      score,
    }
  }

  if (viewCount > 20) {
    return {
      type: 'emotion_sensitive',
      label: '情绪敏感型',
      description: '高频查看账户，容易受波动影响',
      traits: ['频繁查看账户', '对波动反应强烈', '容易情绪化操作', '需要更多心理缓冲'],
      score,
    }
  }

  if (highVolRatio > 0.7) {
    return {
      type: 'aggressive_growth',
      label: '激进成长型',
      description: '偏好高波动资产，追求成长收益',
      traits: ['偏好高波动资产', '风险承受能力较强', '关注成长主题', '需注意仓位控制'],
      score,
    }
  }

  if (recentActions.length === 0 && funds.length > 0) {
    return {
      type: 'long_term_holder',
      label: '长期持有型',
      description: '操作频率低，倾向长期持有',
      traits: ['操作频率低', '长期持有为主', '情绪相对稳定', '适合定投策略'],
      score,
    }
  }

  const cashAndBondRatio = funds
    .filter(f => f.sector === '现金' || f.sector === '债券' || f.sector === '红利')
    .reduce((sum, f) => sum + f.amount, 0) / (calculateTotalAmount(funds) || 1)

  if (cashAndBondRatio > 0.5) {
    return {
      type: 'diversified_safe',
      label: '分散安全型',
      description: '债券和现金占比较高，追求稳健',
      traits: ['偏好低风险资产', '债券和现金比例高', '波动承受能力低', '注重资产安全'],
      score,
    }
  }

  return {
    type: 'balanced',
    label: '均衡配置型',
    description: '资产配置相对均衡，风险适中',
    traits: ['配置相对均衡', '风险适中', '操作频率正常', '情绪较为稳定'],
    score,
  }
}

export function getBehaviorTags(funds: Fund[]): BehaviorTag[] {
  const highVolRatio = calculateHighVolatilityRatio(funds)
  const maxConcentration = getMaxSectorConcentration(funds)
  const viewCount = getRecentBehaviorCount('view_account', 168)
  const recentActions = getActions().filter(a => a.createTime > Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentAddFunds = getBehaviorLogs().filter(
    l => l.eventType === 'add_position' && l.eventTime > Date.now() - 7 * 24 * 60 * 60 * 1000
  )

  return [
    {
      id: 'chase_rise',
      label: '容易追涨',
      description: '高涨幅后新增仓位',
      triggered: recentAddFunds.length > 3,
      triggerCondition: '近7天新增仓位超过3次',
    },
    {
      id: 'easy_panic',
      label: '容易恐慌',
      description: '大跌后频繁查看',
      triggered: viewCount > 15,
      triggerCondition: '近7天查看账户超过15次',
    },
    {
      id: 'long_overweight',
      label: '长期重仓',
      description: '高风险仓位持续30天',
      triggered: highVolRatio > 0.7,
      triggerCondition: '高波动资产占比超过70%',
    },
    {
      id: 'frequent_regret',
      label: '频繁后悔',
      description: '短期多次减仓',
      triggered: recentActions.filter(a => a.actionType === 'reduce').length >= 3,
      triggerCondition: '近7天减仓超过3次',
    },
    {
      id: 'gambling_tendency',
      label: '赌博倾向',
      description: '单主题超60%',
      triggered: maxConcentration.ratio > 0.6,
      triggerCondition: '单一主题仓位超过60%',
    },
  ]
}
