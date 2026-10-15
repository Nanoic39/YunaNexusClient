import { adminHttp } from '../http/client'
import type { FunnelResult, RetentionResult, SegmentResult, UserProfileResult } from '../types'

const BASE = '/api/v1/analytics'

/**
 * 行为分析 · 管理后台。
 *
 * 契约见后端 §8.2；阶段 10.4 真实查询落地前服务端返回空结果占位，
 * 页面需对空数据做空态降级，不得以 Mock 兜底生产环境。
 */
export const analyticsApi = {
  /** 漏斗分析：`steps` 为按顺序排列的事件名序列 */
  funnel: (steps: string[]) =>
    adminHttp.request<FunnelResult>(`${BASE}/funnel`, { query: { steps: steps.join(',') } }),

  /** 留存分析：`cohort` 为起始事件名 */
  retention: (cohort: string) =>
    adminHttp.request<RetentionResult>(`${BASE}/retention`, { query: { cohort } }),

  /** 用户分群：`condition` 为筛选条件表达式 */
  segments: (condition: string) =>
    adminHttp.request<SegmentResult>(`${BASE}/segments`, { query: { condition } }),

  /** 单用户画像 */
  profile: (userId: number) =>
    adminHttp.request<UserProfileResult>(`${BASE}/profile`, { query: { userId } }),
}
