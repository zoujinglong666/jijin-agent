import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code';

/**
 * 业务异常类
 * 携带业务错误码（与HTTP状态码分离）
 * AllExceptionsFilter 会自动捕获并转为 { code, message, data: null }
 */
export class BizException extends HttpException {
  readonly bizCode: ErrorCode;

  constructor(bizCode: ErrorCode, message?: string, httpStatus?: number) {
    const status = httpStatus ?? BizException.defaultHttpStatus(bizCode);
    super(message ?? BizException.defaultMessage(bizCode), status);
    this.bizCode = bizCode;
  }

  private static defaultHttpStatus(code: ErrorCode): number {
    if (code >= 20001 && code <= 20999) return HttpStatus.UNAUTHORIZED;
    if (code === ErrorCode.RATE_LIMITED) return HttpStatus.TOO_MANY_REQUESTS;
    if (code === ErrorCode.FORBIDDEN) return HttpStatus.FORBIDDEN;
    if (code >= 10001 && code <= 10999) return HttpStatus.BAD_REQUEST;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private static defaultMessage(code: ErrorCode): string {
    const map: Partial<Record<ErrorCode, string>> = {
      [ErrorCode.UNKNOWN]: '未知错误',
      [ErrorCode.UNAUTHORIZED]: '未授权',
      [ErrorCode.RATE_LIMITED]: '请求过于频繁',
      [ErrorCode.LLM_KEY_MISSING]: 'LLM API Key未配置',
      [ErrorCode.LLM_CALL_FAILED]: 'LLM调用失败',
    };
    return map[code] ?? '操作失败';
  }
}