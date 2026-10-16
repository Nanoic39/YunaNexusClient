/** 徽章管理契约：目录、手动发放和记录；自动条件规则尚未开放。 */

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
