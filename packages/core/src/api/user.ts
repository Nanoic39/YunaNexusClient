import { userHttp } from '../http/client'
import type {
  UserBadge,
  UserProfileUpdatePayload,
  UserProfileView,
  UserTag,
  UserTagSavePayload,
} from '../types'

const BASE = '/api/v1/user'

/**
 * 用户中心 · 本人资料自助（终端用户）。
 *
 * 身份由网关鉴权后注入 `X-User-Id`，客户端无法指定他人；徽章为系统 / 运营授予，用户端只读。
 */
export const userApi = {
  /** 查询本人资料 */
  getProfile: () => userHttp.request<UserProfileView>(`${BASE}/profile`),

  /** 更新本人资料（仅提交非 null 字段；不含 userId） */
  updateProfile: (payload: UserProfileUpdatePayload) =>
    userHttp.request<UserProfileView>(`${BASE}/profile`, { method: 'PUT', body: payload }),

  /** 查询本人标签 */
  getTags: () => userHttp.request<UserTag[]>(`${BASE}/tags`),

  /** 覆盖式设置本人标签（同一 tagCode 去重，最多 20 个） */
  saveTags: (payload: UserTagSavePayload) =>
    userHttp.request<UserTag[]>(`${BASE}/tags`, { method: 'PUT', body: payload }),

  /** 查询本人徽章（只读，按授予时间倒序） */
  getBadges: () => userHttp.request<UserBadge[]>(`${BASE}/badges`),
}
