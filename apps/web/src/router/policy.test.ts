import { describe, expect, it } from 'vitest'
import { accessDecision, loginDestination } from './policy'
describe('workspace navigation boundary', () => {
  it('keeps only local protected paths and rejects login loops', () => {
    for (const path of [
      'https://evil.test/usr',
      '//evil.test/usr',
      '/\\evil.test/usr',
      '/login',
      '/418',
      '/usr\n/evil',
      '/usr/../../login',
    ]) {
      expect(loginDestination(path, true)).toBe('/console')
    }
    expect(loginDestination('/console/users?page=2', true)).toBe('/console/users?page=2')
    expect(loginDestination(undefined, false)).toBe('/usr')
  })
  it('distinguishes anonymous and authenticated-but-forbidden access', () => {
    expect(accessDecision(false, false, true)).toBe('login')
    expect(accessDecision(true, false, true)).toBe('forbidden')
    expect(accessDecision(true, true, true)).toBe('allow')
    expect(accessDecision(true, false, false)).toBe('allow')
  })
})
