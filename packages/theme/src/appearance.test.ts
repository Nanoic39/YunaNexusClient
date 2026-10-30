import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { appearance, normalizeAppearance, createAppearanceOverrides } from './appearance'
import { themeMode as displayMode } from './theme-mode'
beforeEach(() => {
  appearance.setScope(null)
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  })
})
afterEach(() => {
  appearance.setScope(null)
  vi.unstubAllGlobals()
})
describe('account appearance preferences', () => {
  it('normalizes untrusted saved preferences to supported values', () => {
    expect(normalizeAppearance({ palette: 'javascript:', font: 'unknown', density: null })).toEqual(
      { palette: 'blue', font: 'system', surface: 'plain', density: 'compact' },
    )
  })
  it('isolates accounts and restores a saved account preference', () => {
    appearance.setScope('account-a')
    appearance.set({ palette: 'green', density: 'comfortable' })
    appearance.setScope('account-b')
    expect(appearance.state.palette).toBe('blue')
    appearance.set({ font: 'serif' })
    appearance.setScope('account-a')
    expect(appearance.state.palette).toBe('green')
    expect(appearance.state.font).toBe('system')
    expect(appearance.state.density).toBe('comfortable')
  })
  it('does not change theme preferences when day/night changes', () => {
    appearance.setScope('account-a')
    appearance.set({ palette: 'indigo', surface: 'glass' })
    displayMode.setMode('dark')
    expect(appearance.state.palette).toBe('indigo')
    expect(appearance.state.surface).toBe('glass')
    displayMode.setMode('light')
    expect(appearance.state.palette).toBe('indigo')
  })
  it('resets guest appearance and refuses to persist guest theme changes', () => {
    appearance.setScope('account-a')
    appearance.set({ palette: 'green' })
    appearance.setScope(null)
    appearance.set({ palette: 'indigo' })
    expect(appearance.state.palette).toBe('blue')
    appearance.setScope('account-a')
    expect(appearance.state.palette).toBe('green')
  })
  it('updates explicit component colors without mutating the base or danger colors', () => {
    appearance.setScope('account-a')
    appearance.set({ palette: 'green' })
    const base = {
      common: { errorColor: '#c3313a' },
      Button: { colorPrimary: '#226f9b', borderPrimary: '1px solid #226f9b' },
    }
    const result = createAppearanceOverrides(base)
    expect(result.Button?.colorPrimary).toBe(appearance.colors.value.primary)
    expect(result.Button?.borderPrimary).toBe(`1px solid ${appearance.colors.value.primary}`)
    expect(result.common?.errorColor).toBe('#c3313a')
    expect(base.Button.colorPrimary).toBe('#226f9b')
  })
})
