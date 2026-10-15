/** 用户资料视图（GET /api/v1/user/profile） */
export interface UserProfileView {
  userId: number
  shardIndex: number | null
  externalId: string
  username: string
  nickname: string | null
  avatar: string | null
  email: string | null
  mobileCountry: string | null
  mobile: string | null
  /** 0-禁用 1-正常 */
  status: number
  createTime: string | null
  updateTime: string | null
}

/** 自助更新本人资料入参（仅更新非 null 字段；不含 userId，身份由网关下发） */
export interface UserProfileUpdatePayload {
  nickname?: string | null
  avatar?: string | null
  email?: string | null
  /** 仅在手机号功能开启（`yunanexus.user.mobile-enabled=true`）时可携带，否则返回 30404 */
  mobileCountry?: string | null
  /** 仅在手机号功能开启时可携带，否则返回 30404 */
  mobile?: string | null
}

/** 用户标签 */
export interface UserTag {
  tagCode: string
  tagName: string
  color: string | null
}

/** 自助设置标签入参（覆盖式；同一 tagCode 去重，最多 20 个） */
export interface UserTagSavePayload {
  tags: UserTag[]
}

/** 用户徽章（用户端只读，由系统 / 运营授予） */
export interface UserBadge {
  badgeCode: string
  badgeName: string
  badgeLevel: number
  description: string | null
  icon: string | null
  grantedTime: string | null
}
