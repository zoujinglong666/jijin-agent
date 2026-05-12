import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result } from '../result';

/**
 * 全局响应拦截器
 * 将 controller 返回的数据自动包装为 Result.ok(data)
 * 如果 controller 已经返回 Result 实例，则不再二次包装
 *
 * 注意：SSE 端点使用 @Res() 手动写入，不会经过此拦截器
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Result<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Result<T>> {
    return next.handle().pipe(
      map((data) => {
        // 已经是 Result 实例则不再包装
        if (data instanceof Result) {
          return data;
        }
        return Result.ok(data);
      }),
    );
  }
}