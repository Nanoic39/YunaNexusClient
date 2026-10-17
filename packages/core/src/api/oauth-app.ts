import { readEnv } from '../env'
import { adminHttp, userHttp } from '../http/client'
import type { OAuthAppAuditPayload, OAuthAppSavePayload, OAuthApplicationView } from '../types'

// 按部署配置启用自助接入，开发 Mock 可独立预览。
export const oauthAppRegistrationEnabled = readEnv().oauthAppRegistrationEnabled

const USER_BASE = '/api/v1/auth/account/oauth-apps'
const ADMIN_BASE = '/api/v1/auth/admin/oauth-apps'

/**
 * OAuth 接入应用 · 用户端（申请人视角）。
 *
 * 契约：我的应用列表 / 提交申请 / 更新 / 撤回 / 重置密钥。
 * 生产环境使用真实后端，开发环境可使用 Mock。
 */
export const oauthAppApi = {
  /** 我申请接入的应用列表 */
  mine: () => userHttp.request<OAuthApplicationView[]>(USER_BASE),

  /** 提交接入申请（新应用初始为待审核；创建成功一次性返回 clientSecret） */
  create: (payload: OAuthAppSavePayload) =>
    userHttp.request<OAuthApplicationView>(USER_BASE, { method: 'POST', body: payload }),

  /** 更新接入应用（驳回后可修改再提交；已通过应用修改回调需重新审核） */
  update: (id: number, payload: OAuthAppSavePayload) =>
    userHttp.request<OAuthApplicationView>(`${USER_BASE}/${id}`, { method: 'POST', body: payload }),

  /** 撤回 / 删除接入应用 */
  remove: (id: number) => userHttp.request<void>(`${USER_BASE}/${id}`, { method: 'DELETE' }),

  /** 重置客户端密钥（旧密钥立即失效） */
  resetSecret: (id: number) =>
    userHttp.request<OAuthApplicationView>(`${USER_BASE}/${id}/secret`, { method: 'POST' }),
}

/**
 * OAuth 接入应用 · 管理端（用户 JWT + `admin` 根角色）。
 *
 * 契约：全量列表 / 审核（通过·驳回）/ 启用停用 / 删除。
 */
export const oauthAppAdminApi = {
  classify: (client: string, category: import('../types').ApplicationCategory) =>
    adminHttp.request<void>(
      `/api/v1/auth/admin/clients/${encodeURIComponent(client)}/classification`,
      { method: 'POST', body: { category } },
    ),
  /** 全部接入应用 */
  list: () => adminHttp.request<OAuthApplicationView[]>(ADMIN_BASE),

  /** 审核：通过或驳回 */
  audit: (id: number, payload: OAuthAppAuditPayload) =>
    adminHttp.request<OAuthApplicationView>(`${ADMIN_BASE}/${id}/audit`, {
      method: 'POST',
      body: payload,
    }),

  /** 启用 / 停用（status: 1-启用 3-停用） */
  setStatus: (id: number, status: number) =>
    adminHttp.request<void>(`${ADMIN_BASE}/${id}/status`, { method: 'POST', body: { status } }),

  /** 删除接入应用 */
  remove: (id: number) => adminHttp.request<void>(`${ADMIN_BASE}/${id}`, { method: 'DELETE' }),
}
