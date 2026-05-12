import { Result } from './result';

describe('Result', () => {
  describe('Result.ok', () => {
    it('should create a success result with code 0', () => {
      const result = Result.ok({ id: 1 });
      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data).toEqual({ id: 1 });
    });

    it('should create a success result with custom message', () => {
      const result = Result.ok(null, '操作成功');
      expect(result.code).toBe(0);
      expect(result.message).toBe('操作成功');
      expect(result.data).toBeNull();
    });

    it('should handle null data', () => {
      const result = Result.ok(null);
      expect(result.code).toBe(0);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      const result = Result.ok([1, 2, 3]);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('Result.fail', () => {
    it('should create a failure result with non-zero code', () => {
      const result = Result.fail(10000, '未知错误');
      expect(result.code).toBe(10000);
      expect(result.message).toBe('未知错误');
      expect(result.data).toBeNull();
    });

    it('should create a failure result with auth error code', () => {
      const result = Result.fail(20001, '未授权');
      expect(result.code).toBe(20001);
      expect(result.data).toBeNull();
    });
  });
});