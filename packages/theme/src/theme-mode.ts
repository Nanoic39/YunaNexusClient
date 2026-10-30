import { computed, ref, watch } from 'vue'

/**
 * 日夜显示模式（自动 / 日间 / 夜间）状态。
 *
 * - `auto` 跟随系统 `prefers-color-scheme`；
 * - `light` / `dark` 为用户显式选择；
 * - 选择持久化到 localStorage，刷新后保持。
 *
 * 解析结果会同步到 `<html>` 的 `dark` class 与 `color-scheme`，
 * 供 `global.css` 的变量覆盖与 Naive `darkTheme` 协同工作。
 */
export type ThemeMode = 'auto' | 'light' | 'dark'

/** 解析后的实际主题（不含 auto） */
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'yuna.theme-mode'

function load(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'auto' || raw === 'light' || raw === 'dark') return raw
  } catch {
    /* 隐私模式 / 存储不可用时退回自动 */
  }
  return 'auto'
}

const mode = ref<ThemeMode>(load())

const media =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

const systemDark = ref(media ? media.matches : false)

if (media) {
  media.addEventListener('change', (event) => {
    systemDark.value = event.matches
  })
}

const resolved = computed<ResolvedTheme>(() =>
  mode.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : mode.value,
)

/** 将解析结果落到 `<html>`，首屏与切换共用同一条路径 */
function apply(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark = resolved.value === 'dark'
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}

watch(resolved, apply, { immediate: true })

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode.value)
  } catch {
    /* 静默降级为内存态 */
  }
}

/**
 * 切换日夜显示模式。
 *
 * 同步写入状态与 DOM，便于在 View Transition 的回调中立即截帧；
 * 传入相同模式时不做任何事。
 */
function setMode(next: ThemeMode): void {
  if (next === mode.value) return
  mode.value = next
  persist()
  apply()
}

const ORDER: ThemeMode[] = ['auto', 'light', 'dark']

/** 按 auto → light → dark 循环 */
function cycle(): void {
  const index = ORDER.indexOf(mode.value)
  setMode(ORDER[(index + 1) % ORDER.length])
}

/** 兼容旧调用名；新应用使用 displayMode。此对象只控制日夜显示。 */
export const themeMode = {
  /** 用户选择的模式 */
  mode,
  /** 解析后的实际主题 */
  resolved,
  /** 系统当前是否为深色 */
  systemDark,
  setMode,
  cycle,
}

export type ThemeModeStore = typeof themeMode
