/**
 * 行为分析（yunanexus-analytics）类型。
 *
 * 对应后端契约 §8.2 分析 API；阶段 10.4 真实查询（ClickHouse）落地前，
 * 服务端对以上接口返回空结果占位，前端据此渲染空态。
 */

/** 漏斗分析 · 单个步骤 */
export interface FunnelStep {
  /** 事件名 / 步骤标识 */
  step: string
  /** 到达该步骤的用户数 */
  users: number
}

/** 漏斗分析结果 */
export interface FunnelResult {
  steps: FunnelStep[]
}

/** 留存分析 · 单个同期群行 */
export interface RetentionRow {
  /** 同期群标签（如首日/首个事件日期） */
  cohort: string
  /** 各周期留存率（0-1，缺失周期为 null） */
  rates: Array<number | null>
}

/** 留存分析结果 */
export interface RetentionResult {
  /** 周期标签（如 D0 / D1 / D7） */
  periods: string[]
  rows: RetentionRow[]
}

/** 用户分群结果 */
export interface SegmentResult {
  /** 命中用户 ID 列表 */
  userIds: number[]
  /** 命中用户总数 */
  total: number
}

/** 单用户画像结果 */
export interface UserProfileResult {
  userId: number
  /** 用户标签 */
  tags: string[]
  /** 各事件计数（事件名 → 次数） */
  eventCounts: Record<string, number>
  /** 价值分层（如 高价值 / 一般 / 沉默） */
  valueTier: string
}
