import { BizException } from './biz.exception';
import { ErrorCode } from '../constants/error-code';
import { HttpStatus } from '@nestjs/common';

describe('BizException', () => {
  it('should carry bizCode and message', () => {
    const ex = new BizException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    expect(ex.bizCode).toBe(ErrorCode.USER_NOT_FOUND);
    expect(ex.message).toBe('用户不存在');
  });

  it('should map auth error codes to 401', () => {
    const ex = new BizException(ErrorCode.UNAUTHORIZED);
    expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('should map rate limited to 429', () => {
    const ex = new BizException(ErrorCode.RATE_LIMITED);
    expect(ex.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('should map validation error codes to 400', () => {
    const ex = new BizException(ErrorCode.VALIDATION_FAILED, '参数校验失败');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should map business error codes (3xxxx) to 500 by default', () => {
    const ex = new BizException(ErrorCode.PASSWORD_TOO_WEAK, '密码太弱');
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should use default message when not provided', () => {
    const ex = new BizException(ErrorCode.UNKNOWN);
    expect(ex.message).toBe('未知错误');
  });

  it('should allow custom http status override', () => {
    const ex = new BizException(ErrorCode.USER_NOT_FOUND, 'not found', HttpStatus.NOT_FOUND);
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.bizCode).toBe(ErrorCode.USER_NOT_FOUND);
  });
});