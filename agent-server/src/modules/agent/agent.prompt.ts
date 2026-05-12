import { Injectable } from '@nestjs/common';
import { SYSTEM_PROMPT } from '../../common/constants';
import type { AgentContext, LlmMessage } from '../../common/types';

@Injectable()
export class AgentPrompt {
  buildMessages(context: AgentContext): LlmMessage[] {
    const userPrompt = this.buildUserPrompt(context);
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];
  }

  private buildUserPrompt(context: AgentContext): string {
    const sectorExposure: Record<string, number> = {};
    const total = context.portfolio.reduce((s, f) => s + f.amount, 0);
    if (total > 0) {
      const sectorMap: Record<string, number> = {};
      context.portfolio.forEach(f => { sectorMap[f.sector] = (sectorMap[f.sector] || 0) + f.amount; });
      Object.entries(sectorMap).forEach(([sector, amount]) => {
        sectorExposure[sector] = Math.round(amount / total * 100);
      });
    }

    return `请基于以下信息分析用户当前风险：

用户：
- 行为状态：${context.behavior.level}（分数：${context.behavior.score}）
- 查看频率：${context.behavior.openFrequency}次/24h
- 刷新频率：${context.behavior.refreshFrequency}次/24h
- 情绪状态：${context.emotion.level}（分数：${context.emotion.score}，趋势：${context.emotion.trend}）

持仓：
- 基金数量：${context.portfolio.length}
- 板块暴露：${JSON.stringify(sectorExposure)}
- 总资产：${total.toFixed(0)}元

市场：
- 相关事件：${context.marketEvents.length > 0 ? context.marketEvents.map(e => e.title).join('；') : '暂无重大事件'}

风险：
- 风险分数：${context.risk.score}
- 风险等级：${context.risk.level}
- 集中度：${context.risk.sectorConcentration.toFixed(1)}%
- 波动暴露：${context.risk.marketVolatility.toFixed(1)}%

输出JSON格式的分析结果。`;
  }
}
