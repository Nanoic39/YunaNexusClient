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
  title: string
  content: string
  /** 1-启用 0-停用 */
  status: number
  createTime: string | null
  updateTime: string | null
}
