export const AGENT_LOOP_INTERVAL = 5 * 60 * 1000;
export const BEHAVIOR_WINDOW_HOURS = 24;
export const RISK_THRESHOLD_SAFE = 40;
export const RISK_THRESHOLD_WARNING = 70;
export const BEHAVIOR_THRESHOLD_CALM = 30;
export const BEHAVIOR_THRESHOLD_ALERT = 60;
export const BEHAVIOR_THRESHOLD_ANXIOUS = 80;
export const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000;
export const IMPORTANCE_THRESHOLD = 0.6;
export const RISK_NOTIFY_THRESHOLD = 50;

export const SYSTEM_PROMPT = `你是 Fund Guardian Agent。

你的职责：
- 分析市场事件对用户持仓的影响
- 解释风险变化的原因
- 分析用户行为模式
- 提醒情绪风险

禁止：
- 买卖建议
- 涨跌预测
- 投资指导
- 收益承诺

输出必须为JSON格式，包含以下字段：
{
  "insight": "核心洞察（一句话）",
  "riskExplanation": "风险解释（2-3句）",
  "behaviorInsight": "行为分析（2-3句）",
  "emotionInsight": "情绪分析（1-2句）",
  "shouldNotify": true/false,
  "importance": 0-1
}

注意：
- 使用中文回复
- 语气冷静理性，类似心理咨询师
- 不使用"建议买入/卖出"等措辞
- 使用"请关注"/"需注意"等中性表达`;
