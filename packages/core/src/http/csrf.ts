/**
 * CSRF 令牌引导（见 api-contract 3.7）。
 *
 * CSRF Cookie 为 HttpOnly，前端无需读取其值；只需在变更请求头回显从
 * `GET /api/v1/auth/csrf` 拿到的掩码令牌。令牌按 TTL 进程内缓存。
 */
let cachedToken: string | null = null
let cachedHeaderName = 'X-XSRF-TOKEN'
let expireAt = 0

export interface CsrfBootstrap {
  token: string
  headerName: string
}

/** 记录一次引导结果 */
export function cacheCsrf(bootstrap: CsrfBootstrap, ttlMs = 60_000): void {
  cachedToken = bootstrap.token
  cachedHeaderName = bootstrap.headerName
  expireAt = Date.now() + ttlMs
}

/** 读取缓存的 CSRF 头（未命中或已过期返回 null） */
export function readCsrfHeader(): { name: string; value: string } | null {
  if (!cachedToken || Date.now() >= expireAt) return null
  return { name: cachedHeaderName, value: cachedToken }
}

/** 清空缓存（登出时调用） */
export function resetCsrf(): void {
  cachedToken = null
  expireAt = 0
}
