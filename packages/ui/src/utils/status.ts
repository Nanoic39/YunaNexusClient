/** 语义标签类型，对应 Naive UI `n-tag` 的 type */
export type TagTone = 'success' | 'warning' | 'danger' | 'info' | 'default'

export interface StatusMeta {
  tone: TagTone
  text: string
}

/** 账号状态：0-禁用 1-正常 */
export function userStatusMeta(status: number | null | undefined): StatusMeta {
  return status === 1 ? { tone: 'success', text: '正常' } : { tone: 'danger', text: '禁用' }
}

/** 申诉状态：0-待处理 1-通过 2-驳回 */
export function appealStatusMeta(status: number | null | undefined): StatusMeta {
  switch (status) {
    case 0:
      return { tone: 'warning', text: '待处理' }
    case 1:
      return { tone: 'success', text: '已通过' }
    case 2:
      return { tone: 'default', text: '已驳回' }
    default:
      return { tone: 'default', text: '未知' }
  }
}

/** 通知记录状态：0-待发送 1-已发送 2-发送失败 3-已读 */
export function noticeStatusMeta(status: number | null | undefined): StatusMeta {
  switch (status) {
    case 0:
      return { tone: 'default', text: '待发送' }
    case 1:
      return { tone: 'info', text: '未读' }
    case 2:
      return { tone: 'danger', text: '发送失败' }
    case 3:
      return { tone: 'default', text: '已读' }
    default:
      return { tone: 'default', text: '未知' }
  }
}

/** 通知通道：1-站内信 2-邮件 3-短信 */
export function noticeChannelText(channel: number | null | undefined): string {
  switch (channel) {
    case 1:
      return '站内信'
    case 2:
      return '邮件'
    case 3:
      return '短信'
    default:
      return '—'
  }
}

/** 通用启用状态：1-启用 0-禁用 */
export function enabledStatusMeta(status: number | null | undefined): StatusMeta {
  return status === 1 ? { tone: 'success', text: '启用' } : { tone: 'default', text: '停用' }
}

/** 审计日志结果：1-成功 0-失败 */
export function auditStatusMeta(status: number | null | undefined): StatusMeta {
  return status === 1 ? { tone: 'success', text: '成功' } : { tone: 'danger', text: '失败' }
}

/** 接入应用审核状态：0-待审核 1-已通过 2-已驳回 3-已停用 */
export function oauthAppStatusMeta(status: number | null | undefined): StatusMeta {
  switch (status) {
    case 0:
      return { tone: 'warning', text: '待审核' }
    case 1:
      return { tone: 'success', text: '已通过' }
    case 2:
      return { tone: 'danger', text: '已驳回' }
    case 3:
      return { tone: 'default', text: '已停用' }
    default:
      return { tone: 'default', text: '未知' }
  }
}

/** 数据范围文案 */
export function dataScopeText(scope: number | null | undefined): string {
  switch (scope) {
    case 1:
      return '全部数据'
    case 2:
      return '本部门'
    case 3:
      return '本部门及以下'
    case 4:
      return '仅本人'
    case 5:
      return '自定义'
    default:
      return '—'
  }
}
