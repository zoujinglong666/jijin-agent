import { Injectable } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { BehaviorService } from '../behavior/behavior.service';

export interface RegretScenario {
  id: string;
  title: string;
  desc: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export interface SectorImpact {
  sector: string;
  originalRatio: number;
  change: number;
}

export interface SimulationResult {
  scenarioTitle: string;
  simulatedAmount: number;
  volatilityChange: number;
  profitChange: number;
  riskChange: number;
  insight: string;
  sectorImpacts: SectorImpact[];
}

@Injectable()
export class RegretService {
  constructor(
    private portfolioService: PortfolioService,
    private behaviorService: BehaviorService,
  ) {}

  getScenarios(): RegretScenario[] {
    return [
      {
        id: 'reduce_semi',
        title: '如果3个月前降低半导体仓位30%',
        desc: '减少高波动板块的集中度',
        icon: 'download',
        iconColor: '#8B9DC3',
        bgColor: '#EEF0F7',
      },
      {
        id: 'no_chase',
        title: '如果6个月前没有追涨买入',
        desc: '避免在高点增加仓位',
        icon: 'close',
        iconColor: '#A8B5D1',
        bgColor: '#EEF0F7',
      },
      {
        id: 'no_reduce',
        title: '如果下跌时没有减仓',
        desc: '保持原始仓位不动',
        icon: 'lock',
        iconColor: '#C4A882',
        bgColor: '#F5EFE5',
      },
    ];
  }

  async runSimulation(userId: string, scenarioId: string): Promise<SimulationResult> {
    const funds = await this.portfolioService.getFunds(userId);
    const total = await this.portfolioService.getTotalAmount(userId);
    const sectorRatios = await this.portfolioService.getSectorRatios(userId);
    const highVolRatio = await this.portfolioService.getHighVolatilityRatio(userId);
    const maxConcentration = await this.portfolioService.getMaxSectorConcentration(userId);

    let simulatedAmount = total;
    let volatilityChange = 0;
    let profitChange = 0;
    let riskChange = 0;
    let insight = '';
    const sectorImpacts: SectorImpact[] = [];

    if (scenarioId === 'reduce_semi') {
      const semiRatio = sectorRatios['半导体']?.ratio || 0;
      const semiAmount = sectorRatios['半导体']?.amount || 0;
      const reduceRatio = 0.3;
      const reducedAmount = semiAmount * reduceRatio;

      const newHighVolRatio = total > 0 ? (highVolRatio * total - reducedAmount) / total : 0;
      volatilityChange = (newHighVolRatio - highVolRatio) * 100;

      const semiFunds = funds.filter(f => f.sector === '半导体');
      const avgProfitRate = semiFunds.length > 0
        ? semiFunds.reduce((sum, f) => sum + Number(f.profitRate), 0) / semiFunds.length
        : 0;
      profitChange = -avgProfitRate * reduceRatio * semiRatio * 100;
      riskChange = -(highVolRatio * 100 * 0.15);
      simulatedAmount = total - reducedAmount + reducedAmount * 0.95;

      insight = semiRatio > 0
        ? `降低半导体仓位30%后，你的高波动资产占比从${(highVolRatio * 100).toFixed(1)}%降至约${(newHighVolRatio * 100).toFixed(1)}%。虽然可能错过部分上涨，但账户整体波动会明显减小。${semiRatio > 0.4 ? '你当前半导体仓位偏高，适当降低确实有助于降低风险。' : ''}`
        : '你当前没有半导体持仓，此场景不适用。';

      Object.entries(sectorRatios).forEach(([sector, data]) => {
        const change = sector === '半导体' ? -data.ratio * reduceRatio * 100 * 0.5 : 0;
        sectorImpacts.push({ sector, originalRatio: data.ratio, change });
      });
    } else if (scenarioId === 'no_chase') {
      const recentHighProfitFunds = funds.filter(f => Number(f.profitRate) > 0.1);
      const chaseAmount = recentHighProfitFunds.reduce((sum, f) => sum + Number(f.amount) * 0.3, 0);

      const newTotal = total - chaseAmount;
      const newHighVolRatio = chaseAmount > 0 && newTotal > 0
        ? (highVolRatio * total - chaseAmount * 0.8) / newTotal
        : highVolRatio;
      volatilityChange = (newHighVolRatio - highVolRatio) * 100;

      const avgChaseProfit = recentHighProfitFunds.length > 0
        ? recentHighProfitFunds.reduce((sum, f) => sum + Number(f.profitRate), 0) / recentHighProfitFunds.length
        : 0;
      profitChange = -avgChaseProfit * 30;
      riskChange = -(highVolRatio * 100 * 0.1);
      simulatedAmount = newTotal + chaseAmount * 0.92;

      insight = recentHighProfitFunds.length > 0
        ? `如果不追涨，你可能会避免在高位买入${recentHighProfitFunds.length}只涨幅较大的基金。虽然短期可能错过一些收益，但长期来看，避免追涨往往能获得更好的买入价格。`
        : '你当前持仓中没有明显追涨的基金，投资节奏比较理性。';

      Object.entries(sectorRatios).forEach(([sector, data]) => {
        const isChased = recentHighProfitFunds.some(f => f.sector === sector);
        const change = isChased ? -data.ratio * 0.3 * 100 * 0.3 : 0;
        sectorImpacts.push({ sector, originalRatio: data.ratio, change });
      });
    } else if (scenarioId === 'no_reduce') {
      const reduceActions = funds.map(f => ({
        fund: f,
        wouldHaveMore: Number(f.profitRate) > 0,
      }));

      const keptAmount = reduceActions
        .filter(r => r.wouldHaveMore)
        .reduce((sum, r) => sum + Number(r.fund.amount) * 0.2, 0);
      const lostAmount = reduceActions
        .filter(r => !r.wouldHaveMore)
        .reduce((sum, r) => sum + Number(r.fund.amount) * 0.2, 0);

      profitChange = keptAmount > 0 && total > 0 ? (keptAmount - lostAmount) / total * 100 : 0;
      volatilityChange = highVolRatio * 5;
      riskChange = highVolRatio * 100 * 0.08;
      simulatedAmount = total + (keptAmount - lostAmount) * 0.5;

      insight = `如果下跌时没有减仓，你的原始仓位会保留。${profitChange > 0 ? '从结果来看，持有不动反而可能获得更好的收益。但请注意，这只是事后回看，当时的市场环境可能确实令人不安。' : '从结果来看，减仓可能帮助你避免了一些损失。有时候及时止损也是一种理性的选择。'}\n\n重要的是，不要因为后视镜效应而否定当时的决策。每次操作都是基于当时的信息和情绪状态做出的。`;

      Object.entries(sectorRatios).forEach(([sector, data]) => {
        const change = data.ratio * 2;
        sectorImpacts.push({ sector, originalRatio: data.ratio, change });
      });
    } else {
      insight = '未知场景';
    }

    sectorImpacts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return {
      scenarioTitle: this.getScenarios().find(s => s.id === scenarioId)?.title || '',
      simulatedAmount: Math.max(0, Math.round(simulatedAmount)),
      volatilityChange,
      profitChange,
      riskChange,
      insight,
      sectorImpacts: sectorImpacts.slice(0, 5),
    };
  }
}