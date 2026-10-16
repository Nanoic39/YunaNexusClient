import { adminHttp } from '../http/client'
import type {
  BadgeDefinitionView,
  BadgeGrantPayload,
  BadgeGrantRecord,
  BadgeSavePayload,
} from '../types'

const BASE = '/api/v1/user/admin/badges'

/**
 * 徽章中心 · 管理后台（用户 JWT + `admin` 根角色）。
 *
 * 契约：`GET/POST /admin/badges`、`POST/DELETE /admin/badges/{id}`、
 * `POST /admin/badges/{id}/grant`（手动发放）、`GET /admin/badges/records`（发放记录）。
 * 生产环境使用真实后端，开发环境可使用 Mock。
 */
export const badgeAdminApi = {
  /** 徽章定义列表 */
  list: () => adminHttp.request<BadgeDefinitionView[]>(BASE),

  /** 新建徽章定义 */
  create: (payload: BadgeSavePayload) =>
    adminHttp.request<BadgeDefinitionView>(BASE, { method: 'POST', body: payload }),

  /** 更新徽章定义 */
  update: (id: number, payload: BadgeSavePayload) =>
    adminHttp.request<BadgeDefinitionView>(`${BASE}/${id}`, { method: 'POST', body: payload }),

  /** 删除徽章定义 */
  remove: (id: number) => adminHttp.request<void>(`${BASE}/${id}`, { method: 'DELETE' }),

  /** 手动发放给用户（幂等） */
  grant: (id: number, payload: BadgeGrantPayload) =>
    adminHttp.request<void>(`${BASE}/${id}/grant`, { method: 'POST', body: payload }),

  /** 发放记录 */
  records: () => adminHttp.request<BadgeGrantRecord[]>(`${BASE}/records`),
}
