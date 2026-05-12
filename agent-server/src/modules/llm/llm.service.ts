import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmMessage, LlmResponse, LlmModelConfig } from '../../common/types';
import { LLM_MODELS } from '../../common/types';
import { Response } from 'express';
import { BizException } from '../../common/exceptions/biz.exception';
import { ErrorCode } from '../../common/constants/error-code';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private defaultProvider: string;
  private defaultApiKey: string;
  private defaultBaseUrl: string;
  private defaultModel: string;

  constructor(private configService: ConfigService) {
    this.defaultProvider = this.configService.get('LLM_PROVIDER', 'deepseek');
    this.defaultApiKey = this.configService.get('LLM_API_KEY', '');
    this.defaultBaseUrl = this.configService.get('LLM_BASE_URL', 'https://api.deepseek.com');
    this.defaultModel = this.configService.get('LLM_MODEL', 'deepseek-v4-pro');
  }

  getAvailableModels(): LlmModelConfig[] {
    return LLM_MODELS;
  }

  private resolveModelConfig(modelId?: string): { provider: string; apiKey: string; baseUrl: string; model: string } {
    if (modelId) {
      const found = LLM_MODELS.find(m => m.id === modelId);
      if (found) {
        return {
          provider: found.provider,
          apiKey: this.defaultApiKey,
          baseUrl: found.baseUrl,
          model: found.model,
        };
      }
    }
    return {
      provider: this.defaultProvider,
      apiKey: this.defaultApiKey,
      baseUrl: this.defaultBaseUrl,
      model: this.defaultModel,
    };
  }

  async chatStream(messages: LlmMessage[], modelId: string | undefined, res: Response): Promise<void> {
    const config = this.resolveModelConfig(modelId);

    if (!config.apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'LLM API Key未配置，请在后端.env中设置LLM_API_KEY' })}\n\n`);
      res.end();
      return;
    }

    try {
      const url = `${config.baseUrl}/v1/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.3,
          max_tokens: 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`LLM API error: ${response.status} ${errorText}`);
        res.write(`data: ${JSON.stringify({ error: `LLM API调用失败: ${response.status}` })}\n\n`);
        res.end();
        return;
      }

      if (!response.body) {
        res.write(`data: ${JSON.stringify({ error: 'LLM API返回空响应' })}\n\n`);
        res.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      res.end();
    } catch (error) {
      this.logger.error('LLM stream failed', error instanceof Error ? error.message : String(error));
      res.write(`data: ${JSON.stringify({ error: 'LLM调用异常' })}\n\n`);
      res.end();
    }
  }

  async chat(messages: LlmMessage[], modelId?: string): Promise<LlmResponse> {
    const config = this.resolveModelConfig(modelId);

    if (!config.apiKey) {
      throw new BizException(ErrorCode.LLM_KEY_MISSING, 'LLM API Key未配置，请在后端.env中设置LLM_API_KEY');
    }

    try {
      const url = `${config.baseUrl}/v1/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(`LLM API error: ${response.status} ${errorText}`);
        throw new BizException(ErrorCode.LLM_CALL_FAILED, `LLM API调用失败: ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        content: data.choices?.[0]?.message?.content || '',
        model: config.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error('LLM call failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}
