/**
 * 徽章中心 · 管理后台类型。
 *
 * 后端现仅提供内部发放接口 `POST /internal/user/badges/grant`（§4.6）与用户端只读
 * `GET /api/v1/user/badges`（§4.9）；下述管理端接口为前端据「徽章发放与管理」需求
 * 约定的契约，待后端补齐后即可切换真实网关（生产环境不做 Mock 兜底）。
 */

/** 发放方式：手动发放 / 条件自动发放 */
export type BadgeGrantType = 'manual' | 'condition'

/** 管理后台 · 徽章定义视图 */
export interface BadgeDefinitionView {
  id: number
  badgeCode: string
  badgeName: string
  badgeLevel: number
  description: string | null
  icon: string | null
  grantType: BadgeGrantType
  /** 条件发放表达式（`grantType=condition` 时生效，如 `login >= 7`） */
  condition: string | null
  /** 0-停用 1-启用 */
  status: number
  /** 累计发放人次 */
  grantedCount: number
  createTime: string | null
  updateTime: string | null
}

/** 管理后台 · 徽章保存入参 */
export interface BadgeSavePayload {
  badgeCode: string
  badgeName: string
  badgeLevel: number
  description?: string
  icon?: string
  grantType: BadgeGrantType
  condition?: string
  status: number
}

/** 管理后台 · 徽章发放记录 */
export interface BadgeGrantRecord {
  id: number
  badgeId: number
  badgeCode: string
  badgeName: string
  userId: number
  username: string
  grantType: BadgeGrantType
  grantedTime: string | null
}

/** 管理后台 · 手动发放入参 */
export interface BadgeGrantPayload {
  userIds: number[]
}
