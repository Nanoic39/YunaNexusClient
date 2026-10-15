import { adminHttp, userHttp } from '../http/client'
import type { NoticeRecordView, PageQuery, PageResult } from '../types'

const BASE = '/api/v1/notice'

/** 通知中心 · 站内信（终端用户） */
export const noticeApi = {
  /** 站内信收件箱（分页，按时间倒序） */
  inbox: (query?: PageQuery) =>
    userHttp.request<PageResult<NoticeRecordView>>(`${BASE}/inbox`, { query }),

  /** 标记已读 */
  markRead: (noticeId: number) => userHttp.request<void>(`${BASE}/read/${noticeId}`, { method: 'POST' }),
}

/** 通知中心 · 记录查询（管理后台） */
export const noticeAdminApi = {
  record: (noticeId: number) => adminHttp.request<NoticeRecordView>(`${BASE}/record/${noticeId}`),
  list: (query: { templateCode?: string; receiver?: string; status?: number } & PageQuery) =>
    adminHttp.request<PageResult<NoticeRecordView>>(`${BASE}/record/list`, { query }),
}
