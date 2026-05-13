import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RiskService } from '../risk/risk.service';
import { BehaviorService } from '../behavior/behavior.service';
import { XIAOJI_SYSTEM_PROMPT } from './chat.prompt';
import { AgentToolsService } from '../agent/agent.tools';
import type { LlmMessage } from '../../common/types';
import { User } from '../../database/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';

export interface ChatResponse {
  text: string;
  card: any | null;
  profile_update: Record<string, any> | null;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private llmService: LlmService,
    private portfolioService: PortfolioService,
    private riskService: RiskService,
    private behaviorService: BehaviorService,
    private agentToolsService: AgentToolsService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async chat(userId: string, messages: LlmMessage[], modelId?: string): Promise<ChatResponse> {
    const [contextMessage, profileMessage] = await Promise.all([
      this.buildUserContext(userId),
      this.buildProfileContext(userId),
    ]);

    const fullMessages: LlmMessage[] = [
      { role: 'system', content: XIAOJI_SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
    ];
    if (profileMessage) {
      fullMessages.push({ role: 'system', content: profileMessage });
    }
    fullMessages.push(...messages);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resolvedModelId = modelId || user?.llmModel || undefined;
    const response = await this.llmService.chat(fullMessages, resolvedModelId, user?.llmApiKey);

    return this.parseAIResponse(response.content, userId);
  }

  async chatStream(userId: string, messages: LlmMessage[], modelId: string | undefined, res: Response): Promise<void> {
    const [contextMessage, profileMessage] = await Promise.all([
      this.buildUserContext(userId),
      this.buildProfileContext(userId),
    ]);

    const fullMessages: LlmMessage[] = [
      { role: 'system', content: XIAOJI_SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
    ];
    if (profileMessage) {
      fullMessages.push({ role: 'system', content: profileMessage });
    }
    fullMessages.push(...messages);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const resolvedModelId = modelId || user?.llmModel || undefined;

    // For streaming, we accumulate the full response and parse at the end
    let fullContent = '';
    let toolCalls: any[] = [];
    const originalWrite = res.write.bind(res);
    const wrappedRes = {
      ...res,
      write: (chunk: any) => {
        try {
          const str = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
          const dataMatch = str.match(/data:\\s*({.*?})\\n/);
          if (dataMatch) {
            const parsed = JSON.parse(dataMatch[1]);
            if (parsed.content) {
              fullContent += parsed.content;
            }
            if (parsed.tool_calls) {
              toolCalls = [...toolCalls, ...parsed.tool_calls];
            }
          }
        } catch {}
        return originalWrite(chunk);
      },
      end: async (...args: any[]) => {
        // After stream ends, try to save profile_update and execute tools
        try {
          const parsed = this.parseAIResponseRaw(fullContent);
          if (parsed.profile_update) {
            this.saveProfile(userId, parsed.profile_update).catch(() => {});
          }
          
          // Execute any detected tool calls
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function?.name || toolCall.name;
            const toolArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
            
            if (toolName) {
              await this.agentToolsService.executeTool(userId, toolName, toolArgs, res);
            }
          }
        } catch {}
        return res.end(...args);
      },
    } as any;

    await this.llmService.chatStream(fullMessages, resolvedModelId, wrappedRes, user?.llmApiKey);
  }

  private parseAIResponse(rawContent: string, userId: string): ChatResponse {
    const result = this.parseAIResponseRaw(rawContent);

    // Save profile_update asynchronously
    if (result.profile_update) {
      this.saveProfile(userId, result.profile_update).catch(() => {});
    }

    return result;
  }

  private parseAIResponseRaw(rawContent: string): ChatResponse {
    const fallback: ChatResponse = { text: rawContent, card: null, profile_update: null };

    // Try to parse as JSON directly
    try {
      const parsed = JSON.parse(rawContent);
      if (typeof parsed === 'object' && parsed !== null && 'text' in parsed) {
        return {
          text: String(parsed.text || ''),
          card: parsed.card || null,
          profile_update: parsed.profile_update || null,
        };
      }
    } catch {}

    // Try to extract JSON from markdown code block
    const jsonMatch = rawContent.match(/```(?:json)?\\s*\\n?([\\s\\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (typeof parsed === 'object' && 'text' in parsed) {
          return {
            text: String(parsed.text || ''),
            card: parsed.card || null,
            profile_update: parsed.profile_update || null,
          };
        }
      } catch {}
    }

    // Try to find a JSON object in the content
    const objMatch = rawContent.match(/\\{[\\s\\S]*\"text\"[\\s\\S]*\\}/);
    if (objMatch) {
      try {
        const parsed = JSON.parse(objMatch[0]);
        if ('text' in parsed) {
          return {
            text: String(parsed.text || ''),
            card: parsed.card || null,
            profile_update: parsed.profile_update || null,
          };
        }
      } catch {}
    }

    return fallback;
  }

  private async saveProfile(userId: string, profileUpdate: Record<string, any>): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return;

      // Store profile as JSON in riskPreference field or use a dedicated column
      // For now, we update the user's riskPreference if risk_tolerance is provided
      if (profileUpdate.risk_tolerance) {
        const toleranceMap: Record<string, string> = {
          conservative: 'conservative',
          moderate: 'balanced',
          balanced: 'balanced',
          aggressive: 'aggressive',
        };
        const mapped = toleranceMap[profileUpdate.risk_tolerance] || profileUpdate.risk_tolerance;
        await this.userRepository.update({ id: userId }, { riskPreference: mapped });
      }

      this.logger.log(`Profile updated for user ${userId}: ${JSON.stringify(profileUpdate)}`);
    } catch (e) {
      this.logger.error('saveProfile failed', e instanceof Error ? e.message : String(e));
    }
  }

  private async buildProfileContext(userId: string): Promise<string | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return null;

      const profile: Record<string, any> = {};
      if (user.riskPreference) profile.risk_tolerance = user.riskPreference;

      if (Object.keys(profile).length === 0) return null;
      return `用户画像（已收集的信息，请优先利用，避免重复提问）：\\n${JSON.stringify(profile, null, 2)}`;
    } catch {
      return null;
    }
  }

  private async buildUserContext(userId: string): Promise<string> {
    try {
      const funds = await this.portfolioService.getFunds(userId);
      const total = await this.portfolioService.getTotalAmount(userId);
      const sectorRatios = await this.portfolioService.getSectorRatios(userId);
      const highVolRatio = await this.portfolioService.getHighVolatilityRatio(userId);
      const maxConcentration = await this.portfolioService.getMaxSectorConcentration(userId);
      const behaviorState = await this.behaviorService.getBehaviorState(userId);
      const personality = await this.behaviorService.getPersonality(userId);
      const riskAlerts = await this.riskService.getAlerts(userId);

      const sectorInfo = Object.entries(sectorRatios)
        .map(([sector, data]) => `${sector}: ${(data.ratio * 100).toFixed(1)}% (${data.amount.toFixed(0)}元)`)
        .join(', ');

      const fundList = funds
        .slice(0, 20)
        .map(f => `${f.name}(${f.code}) - ${f.sector}板块, 金额${Number(f.amount).toFixed(0)}元, 收益率${Number(f.profitRate).toFixed(2)}%`)
        .join('\\n');

      return `用户当前持仓数据：
- 持有基金数量：${funds.length}只
- 总资产：${total.toFixed(0)}元
- 高波动资产占比：${(highVolRatio * 100).toFixed(1)}%
- 最大集中度：${maxConcentration.sector} ${(maxConcentration.ratio * 100).toFixed(1)}%
- 板块分布：${sectorInfo || '暂无'}
- 投资人格：${personality.label}（${personality.description}）
- 行为状态：${behaviorState.level}（分数${behaviorState.score}，24h查看${behaviorState.portfolioViewCount}次）
- 风险告警：${riskAlerts.length > 0 ? riskAlerts.map(a => a.title).join('；') : '暂无'}

持仓明细（最多20只）：
${fundList || '暂无持仓'}`;
    } catch (e) {
      this.logger.error('buildUserContext failed', e instanceof Error ? e.message : String(e));
      return '用户持仓数据暂时无法获取，请以通用知识回答。';
    }
  }
}