import { adminHttp, http, userHttp } from '../http/client'
import type {
  AdminUserQuery,
  AdminUserView,
  AppealAuditPayload,
  AppealQuery,
  AppealView,
  CaptchaResult,
  CsrfResult,
  IdentityResult,
  LoginPayload,
  PageResult,
  RegisterPayload,
  ResetPasswordPayload,
  TokenResult,
  UnlockAppealPayload,
} from '../types'

const BASE = '/api/v1/auth'

/** 认证中心 · 终端用户接口 */
export const authApi = {
  /** 登录 */
  login: (payload: LoginPayload) => http.request<TokenResult>(`${BASE}/login`, { method: 'POST', body: payload }),

  /** 登出（吊销当前会话） */
  logout: () => userHttp.request<void>(`${BASE}/logout`, { method: 'POST' }),

  /** 全局登出（撤销账号纪元，失效所有会话） */
  logoutAll: () => userHttp.request<void>(`${BASE}/logout-all`, { method: 'POST' }),

  /** 刷新令牌（一次性轮转） */
  refresh: (refreshToken: string) =>
    http.request<TokenResult>(`${BASE}/refresh`, { method: 'POST', body: { refreshToken } }),

  /** 注册 */
  register: (payload: RegisterPayload) =>
    http.request<string>(`${BASE}/register`, { method: 'POST', body: payload }),

  /** 提交解锁申诉 */
  unlockAppeal: (payload: UnlockAppealPayload) =>
    http.request<void>(`${BASE}/unlock-appeal`, { method: 'POST', body: payload }),

  /** 签发验证码 */
  captcha: (username: string) => http.request<CaptchaResult>(`${BASE}/captcha`, { query: { username } }),

  /** 当前身份 */
  me: () => userHttp.request<IdentityResult>(`${BASE}/me`),

  /** CSRF 令牌引导 */
  csrf: () => http.request<CsrfResult>(`${BASE}/csrf`),
}

/** 认证中心 · 管理后台接口（用户 JWT，后端按 admin 角色放行） */
export const authAdminApi = {
  /** 分页查询申诉 */
  listAppeals: (query: AppealQuery) =>
    adminHttp.request<PageResult<AppealView>>(`${BASE}/admin/appeals`, { query }),

  /** 申诉详情 */
  getAppeal: (id: number) => adminHttp.request<AppealView>(`${BASE}/admin/appeals/${id}`),

  /** 通过申诉（并解锁账号） */
  approveAppeal: (id: number, payload: AppealAuditPayload = {}) =>
    adminHttp.request<void>(`${BASE}/admin/appeals/${id}/approve`, { method: 'POST', body: payload }),

  /** 驳回申诉 */
  rejectAppeal: (id: number, payload: AppealAuditPayload = {}) =>
    adminHttp.request<void>(`${BASE}/admin/appeals/${id}/reject`, { method: 'POST', body: payload }),

  /** 分页查询用户 */
  listUsers: (query: AdminUserQuery) =>
    adminHttp.request<PageResult<AdminUserView>>(`${BASE}/admin/users`, { query }),

  /** 用户详情 */
  getUser: (userId: number) => adminHttp.request<AdminUserView>(`${BASE}/admin/users/${userId}`),

  /** 启用账号 */
  enableUser: (userId: number) => adminHttp.request<void>(`${BASE}/admin/users/${userId}/enable`, { method: 'POST' }),

  /** 禁用账号 */
  disableUser: (userId: number) =>
    adminHttp.request<void>(`${BASE}/admin/users/${userId}/disable`, { method: 'POST' }),

  /** 解锁账号 */
  unlockUser: (userId: number) => adminHttp.request<void>(`${BASE}/admin/users/${userId}/unlock`, { method: 'POST' }),

  /** 踢下线（撤销全部会话） */
  kickUser: (userId: number) => adminHttp.request<void>(`${BASE}/admin/users/${userId}/kick`, { method: 'POST' }),

  /**
   * 重置用户密码。
   *
   * 依赖后端提供 `POST /api/v1/auth/admin/users/{userId}/reset-password`；
   * 接口缺失时按通用错误处理（生产环境不做 Mock 兜底）。
   */
  resetPassword: (userId: number, payload: ResetPasswordPayload) =>
    adminHttp.request<void>(`${BASE}/admin/users/${userId}/reset-password`, { method: 'POST', body: payload }),
}
