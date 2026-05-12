/**
 * 业务错误码枚举
 * code = 0 表示成功，其余均为错误
 * 1xxxx: 通用错误
 * 2xxxx: 认证授权错误
 * 3xxxx: 业务逻辑错误
 * 4xxxx: 外部服务错误
 */
export enum ErrorCode {
  // ---- 通用 ----
  UNKNOWN = 10000,
  BAD_REQUEST = 10001,
  VALIDATION_FAILED = 10002,
  RATE_LIMITED = 10003,

  // ---- 认证授权 ----
  UNAUTHORIZED = 20001,
  TOKEN_EXPIRED = 20002,
  TOKEN_INVALID = 20003,
  FORBIDDEN = 20004,
  EMAIL_EXISTS = 20005,
  LOGIN_FAILED = 20006,
  ACCOUNT_DISABLED = 20007,

  // ---- 业务逻辑 ----
  USER_NOT_FOUND = 30001,
  PASSWORD_TOO_WEAK = 30002,
  INVALID_EMAIL = 30003,
  FUND_NOT_FOUND = 30004,
  MODEL_NOT_FOUND = 30005,

  // ---- 外部服务 ----
  LLM_KEY_MISSING = 40001,
  LLM_CALL_FAILED = 40002,
  LLM_TIMEOUT = 40003,
  EXTERNAL_API_ERROR = 40004,
}