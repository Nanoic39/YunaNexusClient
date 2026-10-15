/** 通知通道：1-站内信 2-邮件 3-短信 */
export type NoticeChannel = 1 | 2 | 3

/** 通知记录状态：0-待发送 1-已发送 2-发送失败 3-已读 */
export type NoticeStatus = 0 | 1 | 2 | 3

/** 通知记录视图 */
export interface NoticeRecordView {
  id: number
  noticeId: number
  templateCode: string | null
  channel: NoticeChannel
  channelLabel: string | null
  receiver: string | null
  title: string | null
  content: string | null
  params: string | null
  status: NoticeStatus
  retryCount: number | null
  sendTime: string | null
  errorMsg: string | null
  createTime: string | null
}

/** 通知模板视图 */
export interface NoticeTemplateView {
  id: number
  templateCode: string
  templateName: string
  channel: NoticeChannel
  channelLabel: string | null
  /** 支持 `${占位符}` */
  title: string
  /** 支持 `${占位符}` */
  content: string
  /** 1-启用 0-停用 */
  status: number
  remark: string | null
  createTime: string | null
  updateTime: string | null
}

/** 通知模板保存入参（新增 / 修改共用） */
export interface NoticeTemplateSavePayload {
  templateCode: string
  templateName: string
  channel: NoticeChannel
  title: string
  content: string
  remark?: string | null
}

/** 发送通知入参 */
export interface NoticeSendPayload {
  templateCode: string
  /** 缺省取模板配置的通道 */
  channel?: NoticeChannel
  receivers: string[]
  /** 模板占位符参数 */
  params?: Record<string, string>
  /** 延迟等级（1s 5s 10s 30s 1m …），<=0 立即发送 */
  delayLevel?: number
}
