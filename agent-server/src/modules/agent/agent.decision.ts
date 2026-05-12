import { Injectable } from '@nestjs/common';
import type { AgentOutput } from '../../common/types';
import { IMPORTANCE_THRESHOLD, NOTIFICATION_COOLDOWN_MS, RISK_NOTIFY_THRESHOLD } from '../../common/constants';

@Injectable()
export class AgentDecision {
  private lastNotificationTime: Map<string, number> = new Map();
  private recentMessages: Map<string, string[]> = new Map();

  applyRules(userId: string, raw: AgentOutput, riskScore: number = 0, behaviorLevel: string = 'calm'): AgentOutput {
    let output = { ...raw };

    if (output.importance < IMPORTANCE_THRESHOLD) {
      output.shouldNotify = false;
    }

    if (riskScore < RISK_NOTIFY_THRESHOLD && behaviorLevel !== 'panic') {
      output.shouldNotify = false;
    }

    const lastTime = this.lastNotificationTime.get(userId) || 0;
    if (Date.now() - lastTime < NOTIFICATION_COOLDOWN_MS) {
      output.shouldNotify = false;
    }

    if (this.isDuplicate(userId, output.insight)) {
      output.shouldNotify = false;
    }

    if (behaviorLevel === 'panic' && riskScore >= 70) {
      output.shouldNotify = true;
      output.importance = Math.max(output.importance, 0.9);
    }

    if (output.shouldNotify) {
      this.lastNotificationTime.set(userId, Date.now());
      this.addRecentMessage(userId, output.insight);
    }

    output.insight = this.sanitizeOutput(output.insight);
    output.riskExplanation = this.sanitizeOutput(output.riskExplanation);
    output.behaviorInsight = this.sanitizeOutput(output.behaviorInsight);
    output.emotionInsight = this.sanitizeOutput(output.emotionInsight);

    return output;
  }

  private isDuplicate(userId: string, insight: string): boolean {
    const recent = this.recentMessages.get(userId) || [];
    return recent.some(msg => this.similarity(msg, insight) > 0.7);
  }

  private addRecentMessage(userId: string, insight: string): void {
    if (!this.recentMessages.has(userId)) this.recentMessages.set(userId, []);
    const messages = this.recentMessages.get(userId)!;
    messages.push(insight);
    if (messages.length > 10) messages.shift();
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private sanitizeOutput(text: string): string {
    const forbidden = [
      '建议买入', '建议卖出', '建议加仓', '建议减仓',
      '应该买入', '应该卖出', '可以买入', '可以卖出',
      '未来会上涨', '未来会下跌', '预测涨', '预测跌',
      '推荐买入', '推荐卖出', '赶紧买入', '赶紧卖出',
      '马上买入', '马上卖出', '一定要买', '一定要卖',
    ];
    let sanitized = text;
    forbidden.forEach(word => {
      sanitized = sanitized.replace(new RegExp(word, 'g'), '请关注');
    });
    return sanitized;
  }
}
