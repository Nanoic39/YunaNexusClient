import { computed, reactive, readonly, watch } from 'vue'
import { themeMode as displayMode } from './theme-mode'
import { blue } from './tokens'
import type { GlobalThemeOverrides } from 'naive-ui'

/** 主题方案只包含视觉偏好；日夜模式使用独立的 displayMode。 */
export interface AppearancePreferences {
  palette: 'blue' | 'green' | 'indigo'
  font: 'system' | 'serif'
  surface: 'plain' | 'glass'
  density: 'compact' | 'comfortable'
}
const defaults: AppearancePreferences = {
  palette: 'blue',
  font: 'system',
  surface: 'glass',
  density: 'compact',
}
export const paletteOptions = [
  {
    value: 'blue',
    label: '晴蓝',
    light: { primary: '#226f9b', hover: '#1b5878' },
    dark: { primary: '#8bc9e8', hover: '#a6d6ef' },
  },
  {
    value: 'green',
    label: '松绿',
    light: { primary: '#237563', hover: '#195c4d' },
    dark: { primary: '#78cbb6', hover: '#9cdcc9' },
  },
  {
    value: 'indigo',
    label: '靛紫',
    light: { primary: '#5b5caf', hover: '#46478e' },
    dark: { primary: '#b7b5f5', hover: '#ceccff' },
  },
] as const
const fonts = {
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  serif: '"Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", SimSun, Georgia, serif',
}
export function normalizeAppearance(value: unknown): AppearancePreferences {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    palette: ['blue', 'green', 'indigo'].includes(String(source.palette))
      ? (source.palette as AppearancePreferences['palette'])
      : defaults.palette,
    font: source.font === 'serif' ? 'serif' : 'system',
    surface: source.surface === 'glass' ? 'glass' : 'plain',
    density: source.density === 'comfortable' ? 'comfortable' : 'compact',
  }
}
const state = reactive<AppearancePreferences>({ ...defaults })
let scope: string | null = null
const colors = computed(() => {
  const option =
    paletteOptions.find((option) => option.value === state.palette) ?? paletteOptions[0]
  return displayMode.resolved.value === 'dark' ? option.dark : option.light
})
const fontFamily = computed(() => fonts[state.font])
function apply() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--yuna-primary', colors.value.primary)
  root.style.setProperty('--yuna-primary-hover', colors.value.hover)
  root.style.setProperty(
    '--yuna-primary-soft',
    'color-mix(in srgb, var(--yuna-primary) 9%, var(--ws-surface))',
  )
  root.style.setProperty(
    '--ws-selected',
    'color-mix(in srgb, var(--yuna-primary) 11%, var(--ws-surface))',
  )
  root.style.setProperty('--yuna-font-family', fontFamily.value)
  root.dataset.density = state.density
  root.dataset.surface = state.surface
}
watch([colors, fontFamily, () => state.density, () => state.surface], apply, {
  immediate: true,
  flush: 'sync',
})
function setScope(identity: string | null) {
  if (scope === identity) return
  scope = identity
  let value: unknown = null
  if (scope) {
    try {
      value = JSON.parse(
        localStorage.getItem(`yuna.appearance:${encodeURIComponent(scope)}`) ?? 'null',
      )
    } catch {
      /* 无效存储回退默认方案 */
    }
  }
  Object.assign(state, normalizeAppearance(value))
}
function set(update: Partial<AppearancePreferences>) {
  // 游客只切换日夜，不写入某个用户的主题偏好。
  if (!scope) return
  Object.assign(state, normalizeAppearance({ ...state, ...update }))
  try {
    localStorage.setItem(`yuna.appearance:${encodeURIComponent(scope)}`, JSON.stringify(state))
  } catch {
    /* 存储不可用时保留本次会话效果 */
  }
}
function reset() {
  set({ ...defaults })
}
export const appearance = { state: readonly(state), colors, fontFamily, setScope, set, reset }

/** Naive的显式组件token也随配色变化，避免只改common而留下蓝色按钮。 */
export function createAppearanceOverrides(base: GlobalThemeOverrides): GlobalThemeOverrides {
  const { primary, hover } = colors.value
  const blend = (fraction: number) => {
    const channels = [1, 3, 5].map((offset) =>
      Math.round(parseInt(primary.slice(offset, offset + 2), 16) * (1 - fraction) + 255 * fraction),
    )
    return '#' + channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')
  }
  const night = displayMode.resolved.value === 'dark'
  const replacements: Record<string, string> = {
    [blue[50].toLowerCase()]: blend(0.94),
    [blue[100].toLowerCase()]: blend(0.88),
    [blue[200].toLowerCase()]: blend(0.72),
    [blue[300].toLowerCase()]: night ? hover : blend(0.55),
    [blue[400].toLowerCase()]: night ? primary : blend(0.35),
    [blue[500].toLowerCase()]: night ? hover : blend(0.2),
    [blue[600].toLowerCase()]: primary,
    [blue[700].toLowerCase()]: primary,
    [blue[800].toLowerCase()]: hover,
    [blue[900].toLowerCase()]: hover,
  }
  function retint(value: unknown): unknown {
    if (typeof value === 'string')
      return value.replace(/#[0-9a-f]{6}/gi, (color) => replacements[color.toLowerCase()] ?? color)
    if (Array.isArray(value)) return value.map(retint)
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, retint(item)]))
    return value
  }
  const result = state.palette === 'blue' ? base : (retint(base) as GlobalThemeOverrides)
  return {
    ...result,
    common: {
      ...result.common,
      fontFamily: fontFamily.value,
      primaryColor: primary,
      primaryColorHover: hover,
      primaryColorPressed: hover,
      primaryColorSuppl: hover,
    },
  }
}
