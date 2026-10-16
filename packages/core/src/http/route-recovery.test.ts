import { beforeEach, expect, it, vi } from 'vitest'
import { recoverRouteChunk } from './route-recovery'
let saved: Map<string, string>, replace: ReturnType<typeof vi.fn>
beforeEach(() => {
  saved = new Map()
  replace = vi.fn()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => saved.set(k, v),
  })
  vi.stubGlobal('window', { location: { origin: 'http://user.test:3000', replace } })
})
it('recovers a missing lazy route at its intended destination only once', () => {
  const error = new Error('Failed to fetch dynamically imported module')
  expect(recoverRouteChunk(error, '/console/files')).toBe(true)
  expect(replace).toHaveBeenCalledWith('http://user.test:3000/console/files')
  expect(recoverRouteChunk(error, '/console/settings')).toBe(false)
  expect(replace).toHaveBeenCalledTimes(1)
})
it('does not reload for business errors or redirect outside the application', () => {
  expect(recoverRouteChunk(new Error('Forbidden'), '/console/files')).toBe(false)
  expect(recoverRouteChunk(new Error('Loading chunk 4 failed'), '//evil.test')).toBe(false)
  expect(replace).not.toHaveBeenCalled()
})
