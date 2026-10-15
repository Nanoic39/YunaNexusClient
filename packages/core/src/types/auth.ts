import type { PageQuery } from './result'

/** 登录请求（POST /api/v1/auth/login） */
export interface LoginPayload {
  /** 支持 username / email / mobile */
  username: string
  password: string
  /** 验证码 ID，失败 ≥3 次后必填 */
  captchaId?: string
  /** 验证码，失败 ≥3 次后必填 */
  captcha?: string
  clientCode: string
}

/** 登录 / 刷新令牌返回体 */
export interface TokenResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  externalId: string
  /** 用户昵称（后端返回，用于展示） */
  nickname?: string
}

/** 验证码签发结果（GET /api/v1/auth/captcha） */
export interface CaptchaResult {
  captchaId: string
  /** 仅本地开发回显，生产恒为 null */
  code: string | null
}

/** 当前身份（GET /api/v1/auth/me） */
export interface IdentityResult {
  externalId: string
  clientCode: string
  /** 用户昵称（后端返回，用于展示） */
  nickname?: string
}

/** CSRF 令牌引导结果（GET /api/v1/auth/csrf） */
export interface CsrfResult {
  token: string
  headerName: string
  parameterName: string
}

/** 注册请求（POST /api/v1/auth/register） */
export interface RegisterPayload {
  username: string
  password: string
  email?: string
  mobile?: string
  mobileCountry?: string
}

/** 解锁申诉请求（POST /api/v1/auth/unlock-appeal） */
export interface UnlockAppealPayload {
  username: string
  password: string
  appealReason: string
  contact?: string
}

/** 管理后台 · 用户视图（不含密码等敏感字段） */
export interface AdminUserView {
  userId: number
  externalId: string
  username: string
  email: string | null
  mobileCountry: string | null
  mobile: string | null
  /** 0-禁用 1-正常 */
  status: number
  lockedUntil: string | null
  lockReason: string | null
  failCount: number
  lastLoginTime: string | null
  lastLoginIp: string | null
  createTime: string | null
  updateTime: string | null
}

/** 管理后台 · 用户列表查询 */
export interface AdminUserQuery extends PageQuery {
  keyword?: string
  status?: number
}

/** 管理后台 · 申诉视图 */
export interface AppealView {
  id: number
  userId: number | null
  username: string | null
  appealReason: string | null
  contact: string | null
  /** 0-待处理 1-通过 2-驳回 */
  status: number
  auditor: string | null
  auditRemark: string | null
  auditTime: string | null
  createTime: string | null
  updateTime: string | null
}

/** 管理后台 · 申诉审核请求体 */
export interface AppealAuditPayload {
  auditor?: string
  remark?: string
}

/** 管理后台 · 申诉列表查询 */
export interface AppealQuery extends PageQuery {
  status?: number
}

/** 审计中心 · 日志上报请求体 */
export interface AuditReportPayload {
  userId?: number
  username?: string
  service: string
  module?: string
  action: string
  method?: string
  uri?: string
  params?: string
  result?: string
  /** 1-成功 0-失败 */
  status?: number
  errorMsg?: string
  ip?: string
  userAgent?: string
  durationMs?: number
  traceId?: string
  createTime?: number
}

/** 审计中心 · 日志视图（查询返回） */
export interface AuditLogView {
  id: number
  userId: number | null
  shardIndex: number | null
  username: string | null
  service: string
  module: string | null
  action: string
  method: string | null
  uri: string | null
  params: string | null
  result: string | null
  /** 1-成功 0-失败 */
  status: number
  errorMsg: string | null
  ip: string | null
  userAgent: string | null
  durationMs: number | null
  traceId: string | null
  createTime: string
}

/** 审计中心 · 日志查询参数 */
export interface AuditLogQuery extends PageQuery {
  userId?: number
  service?: string
  startTime?: number
  endTime?: number
}
