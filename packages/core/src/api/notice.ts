import { adminHttp, userHttp } from '../http/client'
import type {
  NoticeRecordView,
  NoticeSendPayload,
  NoticeTemplateSavePayload,
  NoticeTemplateView,
  PageQuery,
  PageResult,
} from '../types'

const BASE = '/api/v1/notice'

/** 通知中心 · 站内信（终端用户） */
export const noticeApi = {
  /** 当前用户的单条站内信详情；服务端校验接收方。 */
  detail: (noticeId: number) => userHttp.request<NoticeRecordView>(`${BASE}/inbox/${noticeId}`),
  /** 站内信收件箱（分页，按时间倒序，仅 channel=1 且已发送/已读） */
  inbox: (query?: PageQuery) =>
    userHttp.request<PageResult<NoticeRecordView>>(`${BASE}/inbox`, { query }),

  /** 标记已读 */
  markRead: (noticeId: number) => userHttp.request<void>(`${BASE}/read/${noticeId}`, { method: 'POST' }),
}

/** 通知中心 · 管理后台（模板 / 发送 / 记录） */
export const noticeAdminApi = {
  /* ------------------------------ 模板管理 ------------------------------ */

  /** 模板分页列表 */
  listTemplates: (query?: { keyword?: string } & PageQuery) =>
    adminHttp.request<PageResult<NoticeTemplateView>>(`${BASE}/template/list`, { query }),

  /** 模板详情 */
  getTemplate: (id: number) => adminHttp.request<NoticeTemplateView>(`${BASE}/template/${id}`),

  /** 新增模板 */
  createTemplate: (payload: NoticeTemplateSavePayload) =>
    adminHttp.request<NoticeTemplateView>(`${BASE}/template`, { method: 'POST', body: payload }),

  /** 修改模板 */
  updateTemplate: (id: number, payload: NoticeTemplateSavePayload) =>
    adminHttp.request<NoticeTemplateView>(`${BASE}/template/${id}`, { method: 'PUT', body: payload }),

  /** 启用 / 停用模板（1-启用 0-停用） */
  toggleTemplateStatus: (id: number, status: number) =>
    adminHttp.request<void>(`${BASE}/template/${id}/status`, { method: 'POST', query: { status } }),

  /** 删除模板 */
  removeTemplate: (id: number) => adminHttp.request<void>(`${BASE}/template/${id}`, { method: 'DELETE' }),

  /* ------------------------------ 发送 / 记录 ------------------------------ */

  /** 发送通知（按接收方各生成一条记录，经延迟消息异步投递） */
  send: (payload: NoticeSendPayload) =>
    adminHttp.request<NoticeRecordView[]>(`${BASE}/send`, { method: 'POST', body: payload }),

  /** 按全局通知 ID 查询记录详情 */
  record: (noticeId: number) => adminHttp.request<NoticeRecordView>(`${BASE}/record/${noticeId}`),

  /** 记录分页列表（按模板编码 / 接收方 / 状态过滤） */
  listRecords: (query: { templateCode?: string; receiver?: string; status?: number } & PageQuery) =>
    adminHttp.request<PageResult<NoticeRecordView>>(`${BASE}/record/list`, { query }),
}
