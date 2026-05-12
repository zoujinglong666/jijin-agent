/**
 * 统一返回结构
 * 所有接口成功返回 { code: 0, message: 'success', data: T }
 * 异常由 AllExceptionsFilter 统一捕获，同样返回 { code, message, data: null }
 */
export class Result<T = any> {
  readonly code: number;
  readonly message: string;
  readonly data: T | null;

  private constructor(code: number, message: string, data: T | null) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static ok<T>(data: T, message = 'success'): Result<T> {
    return new Result(0, message, data);
  }

  static fail(code: number, message: string): Result<null> {
    return new Result(code, message, null);
  }
}