import { adminHttp } from '../http/client'
import type { AuditLogQuery, AuditLogView, PageResult } from '../types'

const BASE = '/api/v1/audit'

/** 审计检索条件：与后端 AuditQueryFilter 字段一一对应 */
export interface AuditQueryFilter extends AuditLogQuery {
  username?: string
  module?: string
  action?: string
  status?: number
  ip?: string
  keyword?: string
}

/** 证据链校验报告 */
export interface AuditChainReport {
  verified: number
  intact: boolean
  breaks: string[]
}

/** 锚定记录 */
export interface AuditAnchor {
  shardIndex: number
  id: number
  recordHash: string
  anchoredAt: string
}

/**
 * 审计中心 API。
 *
 * 说明：检索走 `/logs/search`（多维过滤），导出走 `/logs/export.csv` 并直接拿 blob，
 * 这样既能保留服务端的 10000 行上限保护，也不需要前端二次拼接。
 */
export const auditApi = {
  /** 兼容旧接口的简单查询 */
  logs: (query: AuditLogQuery) => adminHttp.request<PageResult<AuditLogView>>(`${BASE}/logs`, { query }),

  /** 多维检索 */
  search: (query: AuditQueryFilter, page = 1, size = 20) =>
    adminHttp.request<PageResult<AuditLogView>>(`${BASE}/logs/search`, {
      query: { ...query, page, size },
    }),

  /** 导出 CSV（服务端上限 10000 行） */
  exportCsv: (query: AuditQueryFilter) =>
    adminHttp.request<Blob>(`${BASE}/logs/export.csv`, { query, responseType: 'blob' }),

  /** 校验证据链完整性 */
  verifyChain: (params: { userId?: number; fromId?: number; toId?: number; limit?: number } = {}) =>
    adminHttp.request<AuditChainReport>(`${BASE}/integrity/verify`, { query: params }),

  /** 查看各分片最新锚定 */
  anchors: () => adminHttp.request<AuditAnchor[]>(`${BASE}/integrity/anchor`),

  /** 比对锚定与现状，返回不一致项（空数组表示一致） */
  verifyAnchors: () => adminHttp.request<string[]>(`${BASE}/integrity/anchor/verify`),
}
