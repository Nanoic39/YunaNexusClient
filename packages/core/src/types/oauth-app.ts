/** OAuth接入应用类型：本人申请、管理员审核、回调白名单与一次性客户端密钥。 */

/** 接入应用审核状态：0-待审核 1-已通过 2-已驳回 3-已停用 */
export type ApplicationCategory = 'OFFICIAL_NATIVE' | 'OFFICIAL_THIRD_PARTY' | 'THIRD_PARTY'

export type OAuthAppStatus = 0 | 1 | 2 | 3

/** OAuth 接入应用视图 */
export interface OAuthApplicationView {
  applicationCategory?: ApplicationCategory
  id: number
  /** 客户端标识（由后端创建时分配；审核前不可使用） */
  clientId: string | null
  /** 客户端密钥明文（仅创建 / 重置后一次性返回，其余场景为 null） */
  clientSecret: string | null
  appName: string
  description: string | null
  logo: string | null
  websiteUrl: string | null
  /** 回调地址（至少一个，精确匹配） */
  redirectUris: string[]
  /** 申请的权限范围 */
  scopes: string[]
  ownerUserId: number
  ownerName: string
  status: OAuthAppStatus
  /** 审核备注（驳回原因 / 说明） */
  auditRemark: string | null
  auditTime: string | null
  createTime: string | null
  updateTime: string | null
}

/** 用户端提交 / 更新接入应用入参 */
export interface OAuthAppSavePayload {
  appName: string
  description?: string
  logo?: string
  websiteUrl?: string
  redirectUris: string[]
  scopes: string[]
}

/** 管理端审核入参 */
export interface OAuthAppAuditPayload {
  /** true-通过 false-驳回 */
  approved: boolean
  auditRemark?: string
}

/** 可申请的权限范围目录（用户端选择、管理端展示共用） */
export const OAUTH_SCOPE_OPTIONS: { label: string; value: string }[] = [
  { label: '读取个人资料', value: 'profile:read' },
  { label: '读取邮箱', value: 'email:read' },
  { label: '查看与下载本人文件', value: 'files:read' },
  { label: '上传与删除本人文件', value: 'files:write' },
  { label: '读取站内通知', value: 'notice:read' },
  { label: '读取本人积分', value: 'points:read' },
  { label: '应用积分交易（非官方仅扣减）', value: 'points:write' },
  { label: '查询本应用业务权限', value: 'permissions:read' },
]

/** 权限范围 value → 展示文案 */
export const OAUTH_SCOPE_LABELS: Record<string, string> = Object.fromEntries(
  OAUTH_SCOPE_OPTIONS.map((item) => [item.value, item.label]),
)
