/**
 * 业务错误。
 *
 * 后端所有失败响应都带业务码（`code`）与提示（`msg`），前端统一抛出本错误，
 * 上层只需捕获 `ApiError` 即可拿到可直接展示的文案与 traceId。
 */
export class ApiError extends Error {
  /** 业务码（见 api-contract 错误码区间） */
  readonly code: number
  /** HTTP 状态码 */
  readonly httpStatus: number
  /** 后端补充提示（可为空） */
  readonly tips: string | null
  /** 链路追踪 ID，便于后端排查 */
  readonly traceId: string | null

  constructor(params: {
    code: number
    message: string
    httpStatus: number
    tips?: string | null
    traceId?: string | null
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.httpStatus = params.httpStatus
    this.tips = params.tips ?? null
    this.traceId = params.traceId ?? null
  }

  /** 是否属于鉴权失效（需重新登录） */
  get isUnauthorized(): boolean {
    return this.httpStatus === 401 || this.code === 30001 || this.code === 30501
  }

  /** 是否属于权限不足 */
  get isForbidden(): boolean {
    return this.httpStatus === 403 || this.code === 30002 || this.code === 30003
  }
}

/** 网络层错误（请求未到达 / 响应无法解析） */
export class NetworkError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'NetworkError'
  }
}

/** 把任意异常转换为可直接展示的文案（`ApiError` / `NetworkError` 已自带文案） */
export function toErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
