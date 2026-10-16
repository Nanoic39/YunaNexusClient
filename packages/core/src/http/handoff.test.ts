import { beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
const mocks = vi.hoisted(() => ({
  env: {
    apiBaseUrl: '',
    userAppUrl: 'http://user.test:3000',
    adminAppUrl: 'http://admin.test:3001',
  },
  setTokens: vi.fn(),
  clearUser: vi.fn(),
  request: vi.fn(),
}))
vi.mock('../env', () => ({ readEnv: () => mocks.env }))
vi.mock('./session', () => ({
  session: { setTokens: mocks.setTokens, clearUser: mocks.clearUser },
}))
vi.mock('./client', () => ({ userHttp: { request: mocks.request } }))
import {
  authorizeAdminRedirect,
  buildHandoffUrl,
  buildSsoLoginUrl,
  consumeHandoff,
  pkceChallenge,
  safeLocalRedirect,
} from './handoff'
let store: Map<string, string>
let location: { origin: string; pathname: string; search: string; hash: string }
let history: { replaceState: ReturnType<typeof vi.fn> }
beforeEach(() => {
  vi.clearAllMocks()
  store = new Map()
  location = { origin: 'http://admin.test:3001', pathname: '/login', search: '', hash: '' }
  history = { replaceState: vi.fn() }
  vi.stubGlobal('window', { location, history })
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  vi.stubGlobal('crypto', webcrypto)
})
describe('PKCE login boundary', () => {
  it('matches RFC7636 S256 without secure-context subtle crypto', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })
  it('never exports tokens and only permits configured admin origin', () => {
    const entry = new URL(buildHandoffUrl('http://admin.test:3001/overview'))
    expect(entry.pathname).toBe('/login')
    expect(entry.searchParams.get('reauth')).toBe('1')
    expect(entry.searchParams.get('redirect')).toBe('/overview')
    expect(() => buildHandoffUrl('https://evil.test')).toThrow()
    expect(() => buildHandoffUrl('http://admin.test:3001@evil.test')).toThrow()
  })
  it('keeps verifier in destination tab and rejects external return paths', () => {
    const url = new URL(buildSsoLoginUrl('//evil.test'))
    const pending = JSON.parse(store.get('yuna.sso.pending')!)
    expect(pending.returnTo).toBe('/overview')
    expect(url.searchParams.get('sso_challenge')).toBe(pkceChallenge(pending.verifier))
    expect(url.toString()).not.toContain(pending.verifier)
    expect(safeLocalRedirect('/\\evil.test', '/overview')).toBe('/overview')
  })
  it('rejects forged state before token exchange and removes parameters', async () => {
    buildSsoLoginUrl('/users')
    location.pathname = '/sso/callback'
    location.search = '?code=one-use&state=forged'
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect(await consumeHandoff()).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
    expect(store.has('yuna.sso.pending')).toBe(false)
    expect(history.replaceState).toHaveBeenLastCalledWith(null, '', '/login?error=sso')
  })
  it('exchanges code without cookies or bearer headers, once only', async () => {
    buildSsoLoginUrl('/users?page=2')
    const pending = JSON.parse(store.get('yuna.sso.pending')!)
    location.pathname = '/sso/callback'
    location.search = '?code=one-use&state=' + pending.state
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 1800,
      externalId: 'external',
    }
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ code: 200, data: tokens }) })
    vi.stubGlobal('fetch', fetcher)
    expect(await consumeHandoff()).toBe(true)
    expect(fetcher.mock.calls[0][1].credentials).toBe('omit')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined()
    expect(mocks.setTokens).toHaveBeenCalledWith(tokens, 'web')
    expect(history.replaceState).toHaveBeenLastCalledWith(null, '', '/users?page=2')
    expect(await consumeHandoff()).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('rejects authorization to an untrusted callback', async () => {
    await expect(
      authorizeAdminRedirect('https://evil.test/sso/callback', 'x'.repeat(43), 'y'.repeat(43)),
    ).rejects.toThrow()
    expect(mocks.request).not.toHaveBeenCalled()
  })
})
