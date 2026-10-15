import { beforeEach, afterEach, expect, it, vi } from 'vitest'
vi.mock('./session', () => ({
  session: { state: { accessToken: 'fixture', externalId: 'owner' }, clearUser: vi.fn() },
}))
vi.mock('../env', () => ({ readEnv: () => ({ apiBaseUrl: '', enableCsrf: false }) }))
import { HttpClient } from './client'
beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())
it('does not save an HTTP-200 business error as a downloaded file', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 40001, msg: '分享已失效' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
  )
  await expect(new HttpClient().request('/file', { responseType: 'blob' })).rejects.toThrow(
    '分享已失效',
  )
})
it('allows a real JSON attachment to be downloaded without parsing its contents', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response('{"private":"file"}', {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="data.json"',
          },
        }),
      ),
  )
  const file = await new HttpClient().request<Blob>('/file', { responseType: 'blob' })
  expect(await file.text()).toBe('{"private":"file"}')
})
