import { adminHttp } from '@yuna/core'

/** 管理端用户视图（对齐后端 auth 模块 UserView） */
export interface AdminUserView {
  userId: number
  externalId: string
  username: string
  email: string | null
  mobile: string | null
  status: number
  lockedUntil: string | null
  lockReason: string | null
  failCount: number | null
  lastLoginTime: string | null
  lastLoginIp: string | null
  createTime: string | null
}

export interface AdminUserQuery {
  keyword?: string
  status?: number
  roleId?: number
  permissionId?: number
  page?: number
  size?: number
}

export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

const BASE = '/api/v1/auth/admin'

/** 用户管理接口（对齐 AuthAdminController） */
export const adminUserApi = {
  /** 分页查询用户；keyword 匹配用户名/邮箱/手机号 */
  list: (query: AdminUserQuery) => adminHttp.request<PageResult<AdminUserView>>(`${BASE}/users`, { query }),
  /** 单个用户详情 */
  detail: (userId: number) => adminHttp.request<AdminUserView>(`${BASE}/users/${userId}`),
  /** 启用 / 禁用 / 解锁 / 强制下线 */
  enable: (userId: number) => adminHttp.request<void>(`${BASE}/users/${userId}/enable`, { method: 'POST' }),
  disable: (userId: number) => adminHttp.request<void>(`${BASE}/users/${userId}/disable`, { method: 'POST' }),
  unlock: (userId: number) => adminHttp.request<void>(`${BASE}/users/${userId}/unlock`, { method: 'POST' }),
  kick: (userId: number) => adminHttp.request<void>(`${BASE}/users/${userId}/kick`, { method: 'POST' }),
}
