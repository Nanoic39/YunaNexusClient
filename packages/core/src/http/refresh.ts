import { readEnv } from '../env'
import { SUCCESS_CODE, type Result, type TokenResult } from '../types'
import { session } from './session'
import { cacheCsrf } from './csrf'

/**
 * 会话续期。
 *
 * 后端 accessToken 有效期较短（默认 30 分钟，见 api-contract §3.1），
 * 这里以「401 后一次性重试」的方式用 refreshToken 换取新令牌（§3.3，一次性轮转）。
 * 同一时刻的并发续期合并为一次请求（single-flight），避免旧 refresh 被轮转后互相作废。
 */

let inflight: Promise<boolean> | null = null

/** 用当前 refreshToken 续期；成功返回 true 并写回会话 */
export function refreshSession(): Promise<boolean> {
  inflight ??= doRefresh().finally(() => {
    inflight = null
  })
  return inflight
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = session.state.refreshToken
  if (!refreshToken) return false
  try {
    const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' }
    if (readEnv().enableCsrf) {
      const csrfResponse = await fetch(`${readEnv().apiBaseUrl}/api/v1/auth/csrf`, { credentials: 'include' })
      const csrf = await csrfResponse.json()
      if (!csrfResponse.ok || csrf.code !== SUCCESS_CODE || !csrf.data?.headerName || !csrf.data?.token) return false
      cacheCsrf(csrf.data)
      headers[csrf.data.headerName] = csrf.data.token
    }
    if (session.state.refreshToken !== refreshToken) return false
    // 直接 fetch 以避免与 HttpClient 相互依赖（续期失败不会再次触发续期）
    const response = await fetch(`${readEnv().apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    })
    if (!response.ok) return false
    const result = (await response.json()) as Result<TokenResult>
    if (result.code !== SUCCESS_CODE || !result.data?.accessToken) return false
    if (session.state.refreshToken !== refreshToken) return false
    session.setTokens(result.data, session.state.clientCode ?? undefined)
    return true
  } catch {
    return false
  }
}
