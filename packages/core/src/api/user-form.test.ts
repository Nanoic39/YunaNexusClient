import { describe, expect, it } from 'vitest'
import { normalizeTags, profilePatch, safeAvatarUrl } from './user-form'
import type { UserProfileView } from '../types/user'
const current = {
  nickname: 'Alice',
  avatar: 'https://example.com/a.png',
  email: 'alice@example.com',
} as UserProfileView
const draft = { nickname: 'Alice', avatar: 'https://example.com/a.png', email: 'alice@example.com' }
const origin = 'http://103.39.66.135:3000'
describe('own profile input boundaries', () => {
  it('submits only changed fields and preserves explicit clearing', () => {
    expect(profilePatch(current, { ...draft, nickname: '  Updated  ' }, origin)).toEqual({
      nickname: 'Updated',
    })
    expect(profilePatch(current, { ...draft, avatar: '', email: '' }, origin)).toEqual({
      avatar: '',
      email: '',
    })
    expect(profilePatch(current, draft, origin)).toEqual({})
  })
  it('rejects executable, embedded credentials and mixed external HTTP avatar URLs', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:image/svg+xml,evil',
      'https://user:password@example.com/a',
      'http://elsewhere.test/a',
      '//elsewhere.test/a',
    ]) {
      expect(safeAvatarUrl(url, origin)).toBeUndefined()
    }
    expect(safeAvatarUrl('/assets/avatar.png', origin)).toBe(origin + '/assets/avatar.png')
    expect(safeAvatarUrl('https://example.com/a.png', origin)).toBe('https://example.com/a.png')
  })
  it('enforces backend lengths and contact email format', () => {
    for (const update of [
      { nickname: 'x'.repeat(65) },
      { email: 'invalid' },
      { avatar: 'https://example.com/' + 'x'.repeat(512) },
    ]) {
      expect(() => profilePatch(current, { ...draft, ...update }, origin)).toThrow()
    }
  })
  it('allows clearing all tags and normalizes ordinary names', () => {
    expect(normalizeTags([])).toEqual([])
    expect(normalizeTags([{ tagCode: ' a ', tagName: ' Developer ', color: null }])).toEqual([
      { tagCode: 'a', tagName: 'Developer', color: null },
    ])
  })
  it('rejects tag overflow, duplicate identifiers and unsafe styling', () => {
    const tag = { tagCode: 'a', tagName: 'A', color: '#368fb2' }
    expect(() =>
      normalizeTags(Array.from({ length: 21 }, (_, i) => ({ ...tag, tagCode: String(i) }))),
    ).toThrow()
    expect(() => normalizeTags([tag, tag])).toThrow()
    expect(() => normalizeTags([{ ...tag, color: 'url(evil)' }])).toThrow()
    expect(() => normalizeTags([{ ...tag, tagName: ' ' }])).toThrow()
  })
})
