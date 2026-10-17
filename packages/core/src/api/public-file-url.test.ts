import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../env')>()
  return {
    ...actual,
    readEnv: () => actual.parseEnv({ VITE_API_BASE_URL: 'https://api.example.test' }),
  }
})
import { publicFileUrl } from './workspace'
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
it('resolves anonymous asset links against the configured public API origin', () => {
  vi.stubGlobal('window', { location: { origin: 'http://portal.example.test:3000' } })
  expect(publicFileUrl('/api/v1/file/public/assets/' + 'a'.repeat(43))).toBe(
    'https://api.example.test/api/v1/file/public/assets/' + 'a'.repeat(43),
  )
})
it('rejects foreign origins, script URLs, traversal and private download paths', () => {
  for (const path of [
    'javascript:alert(1)',
    'https://evil.example/image',
    '/api/v1/file/public/assets/../private',
    '/api/v1/file/me/1/download',
  ])
    expect(() => publicFileUrl(path)).toThrow()
})
