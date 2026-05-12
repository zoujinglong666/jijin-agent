import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Result } from '../result';
import { BizException } from '../exceptions/biz.exception';
import { ErrorCode } from '../constants/error-code';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // SSE 请求不走统一JSON包装，直接记录日志
    if (response.headersSent) {
      this.logger.error('Exception after headers sent', exception instanceof Error ? exception.stack : String(exception));
      return;
    }

    let httpStatus: number;
    let bizCode: number;
    let message: string;

    if (exception instanceof BizException) {
      // 业务异常：优先使用业务错误码
      httpStatus = exception.getStatus();
      bizCode = exception.bizCode;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      // NestJS内置异常（UnauthorizedException等）
      httpStatus = exception.getStatus();
      bizCode = this.mapHttpStatusToBizCode(httpStatus);
      const res = exception.getResponse();
      message = typeof res === 'string'
        ? res
        : (res as any).message ?? exception.message;
      // ValidationPipe 返回的 message 可能是数组
      if (Array.isArray(message)) {
        message = message.join('; ');
        bizCode = ErrorCode.VALIDATION_FAILED;
      }
    } else if (exception instanceof Error) {
      // 未捕获的Error（如LLM抛出的 new Error）
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      bizCode = ErrorCode.UNKNOWN;
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      bizCode = ErrorCode.UNKNOWN;
      message = '服务器内部错误';
      this.logger.error('Unknown exception', String(exception));
    }

    // 生产环境不暴露内部错误细节
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      message = '服务器内部错误';
    }

    response.status(httpStatus).json(Result.fail(bizCode, message));
  }

  /** 将HTTP状态码映射到对应的业务错误码 */
  private mapHttpStatusToBizCode(status: number): number {
    const map: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.BAD_REQUEST,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
    };
    return map[status] ?? ErrorCode.UNKNOWN;
  }
}