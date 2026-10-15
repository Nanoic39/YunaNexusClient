import { sha256 } from '@noble/hashes/sha256'
import { readEnv } from '../env'
import type { TokenResult, Result } from '../types'
import { userHttp } from './client'
import { session } from './session'

const PENDING = 'yuna.sso.pending'
const CALLBACK = '/sso/callback'
const FORMAT = /^[A-Za-z0-9_-]{43}$/
const TTL = 5 * 60 * 1000

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function pkceChallenge(verifier: string): string {
  return base64url(sha256(new TextEncoder().encode(verifier)))
}

function random(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)))
}

/** 仅允许应用内部路径，拒绝协议相对地址、反斜杠和外部重定向。 */
export function safeLocalRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback
  const url = new URL(value, window.location.origin)
  return url.origin === window.location.origin ? url.pathname + url.search + url.hash : fallback
}

function adminTarget(target: string): URL {
  const configured = readEnv().adminAppUrl
  if (!configured) throw new Error('未配置管理端地址')
  const expected = new URL(configured)
  const url = new URL(target, window.location.origin)
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== expected.origin || url.username || url.password) {
    throw new Error('拒绝跳转到未授权的管理端地址')
  }
  return url
}

/** 旧函数名保留用于菜单导航；不再把任何会话凭据写入 URL。 */
export function buildHandoffUrl(baseUrl: string): string {
  return adminTarget(baseUrl).toString()
}

/** 在管理端生成 verifier/state，只有公开的 challenge/state 发送到用户端。 */
export function buildSsoLoginUrl(returnTo: unknown = '/overview'): string {
  const env = readEnv()
  if (!env.userAppUrl) return ''
  const verifier = random()
  const state = random()
  const redirectUri = window.location.origin + CALLBACK
  sessionStorage.setItem(PENDING, JSON.stringify({ verifier, state, redirectUri,
    returnTo: safeLocalRedirect(returnTo, '/overview'), createdAt: Date.now() }))
  const login = new URL('/login', env.userAppUrl)
  login.searchParams.set('redirect', redirectUri)
  login.searchParams.set('sso_state', state)
  login.searchParams.set('sso_challenge', pkceChallenge(verifier))
  return login.toString()
}

/** 用户端登录完成后，以 HttpOnly SSO Cookie 换取一次性授权码。 */
export async function authorizeAdminRedirect(target: string, state: unknown, challenge: unknown): Promise<string> {
  const url = adminTarget(target)
  if (url.pathname !== CALLBACK || url.search || url.hash || typeof state !== 'string'
      || typeof challenge !== 'string' || !FORMAT.test(state) || !FORMAT.test(challenge)) {
    throw new Error('统一登录请求无效，请从管理端重新发起登录')
  }
  const result = await userHttp.request<{ redirectUrl: string }>('/api/v1/auth/sso/authorize', {
    method: 'POST', body: { clientCode: 'web', redirectUri: url.toString(), state,
      codeChallenge: challenge, codeChallengeMethod: 'S256' },
  })
  const callback = adminTarget(result.redirectUrl)
  if (callback.pathname !== CALLBACK || callback.searchParams.get('state') !== state) throw new Error('统一登录回调地址无效')
  return callback.toString()
}

/** 消费授权码；state/verifier 留在管理端，交换请求明确不带 Cookie/Authorization。 */
export async function consumeHandoff(): Promise<boolean> {
  if (window.location.hash.startsWith('#yuna_sso=')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    session.clearUser()
    return false
  }
  if (window.location.pathname !== CALLBACK) return false
  const params = new URLSearchParams(window.location.search)
  window.history.replaceState(null, '', CALLBACK)
  const raw = sessionStorage.getItem(PENDING)
  sessionStorage.removeItem(PENDING)
  try {
    if (!raw) throw new Error('登录请求不存在')
    const pending = JSON.parse(raw)
    const code = params.get('code')
    if (!code || params.get('state') !== pending.state || !FORMAT.test(pending.state)
        || !FORMAT.test(pending.verifier) || typeof pending.createdAt !== 'number'
        || Date.now() - pending.createdAt > TTL || pending.createdAt > Date.now()
        || pending.redirectUri !== window.location.origin + CALLBACK) throw new Error('登录请求已失效')
    const response = await fetch(`${readEnv().apiBaseUrl}/api/v1/auth/sso/token`, {
      method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code, state: pending.state, codeVerifier: pending.verifier,
        clientCode: 'web', redirectUri: pending.redirectUri }),
    })
    const result = await response.json() as Result<TokenResult>
    if (!response.ok || result.code !== 200 || !result.data?.accessToken || !result.data.refreshToken) throw new Error('统一登录失败')
    session.setTokens(result.data, 'web')
    window.history.replaceState(null, '', safeLocalRedirect(pending.returnTo, '/overview'))
    return true
  } catch {
    session.clearUser()
    window.history.replaceState(null, '', '/login?error=sso')
    return false
  }
}
