/**
 * 统一响应契约（见 YunaNexusServer `docs/standards.md` 与 `docs/api-contract.md`）。
 */

/** 后端统一响应包装 */
export interface Result<T = unknown> {
  code: number
  msg: string
  tips: string | null
  data: T
  traceId: string | null
  timestamp: number
}

/** 分页结果 */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/** 分页请求参数 */
export interface PageQuery {
  page?: number
  size?: number
}

/** 业务成功码 */
export const SUCCESS_CODE = 200
