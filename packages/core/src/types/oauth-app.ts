/**
 * OAuth 应用接入类型契约。
 *
 * 后端现仅有 SSO 授权码流程（§3.10 `/api/v1/auth/sso/authorize`、§3.11
 * `/api/v1/auth/sso/token`）与用户端「已授权应用」只读视图
 * （`GET /api/v1/auth/account/applications`），暂无「第三方自定义接入应用」的
 * 申请 / 审核 / 管理接口。下述契约为前端据需求（申请自定义 OAuth 接入应用、
 * 管理面板审核与管理应用）约定，待后端补齐后即可切换真实网关
 * （生产环境不做 Mock 兜底）。
 *
 * 约定路由：
 * - 用户端：`/api/v1/auth/account/oauth-apps`
 * - 管理端：`/api/v1/auth/admin/oauth-apps`
 */

/** 接入应用审核状态：0-待审核 1-已通过 2-已驳回 3-已停用 */
export type OAuthAppStatus = 0 | 1 | 2 | 3

/** OAuth 接入应用视图 */
export interface OAuthApplicationView {
  id: number
  /** 客户端标识（审核通过后由后端分配；申请阶段为空） */
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
]

/** 权限范围 value → 展示文案 */
export const OAUTH_SCOPE_LABELS: Record<string, string> = Object.fromEntries(
  OAUTH_SCOPE_OPTIONS.map((item) => [item.value, item.label]),
)
