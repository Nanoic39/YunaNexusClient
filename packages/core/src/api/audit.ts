import { adminHttp } from '../http/client'
import type { AuditLogQuery, AuditLogView, PageResult } from '../types'

const BASE = '/api/v1/audit'

/** 审计中心 · 日志查询 */
export const auditApi = {
  logs: (query: AuditLogQuery) => adminHttp.request<PageResult<AuditLogView>>(`${BASE}/logs`, { query }),
}
