<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { themeMode } from '@yuna/theme'
import type { ThemeMode } from '@yuna/theme'
import { openContextMenu } from '../composables/use-context-menu'
import type { ContextMenuItem } from '../composables/use-context-menu'

/**
 * 顶栏主题切换。
 *
 * - 左键：在 自动 → 日间 → 夜间 之间循环切换；
 * - 右键：接管浏览器右键，弹出「跟随系统 / 日间模式 / 夜间模式」选择菜单
 *   （复用全局 ContextMenu，与其它右键面板统一为磨砂风格）。
 *
 * 切换优先使用 View Transitions API：以点击点（键盘触发时取按钮中心）为圆心，
 * 让新主题圆形揭示展开。截帧前先关掉全站元素过渡，避免「新帧」截取到过渡起始态
 * （旧色）；回调内只等微任务（nextTick）把 Vue 与 Naive 的新配色写入 DOM，
 * 绝不等待渲染帧 —— 否则会在「旧帧已截取、新帧未截取」之间绘制出中间画面而闪屏。
 */

const LABELS: Record<ThemeMode, string> = {
  auto: '跟随系统',
  light: '日间模式',
  dark: '夜间模式',
}

/** 左键循环顺序 */
const ORDER: ThemeMode[] = ['auto', 'light', 'dark']

const mode = themeMode.mode
const label = computed(() => LABELS[mode.value])
const title = computed(() => `日夜：${label.value}（左键切换，右键选择）`)

type ViewTransition = { finished: Promise<void> }
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition
}

/** 切换令牌：连续点击时只让最后一次切换负责收尾（移除临时 class） */
let switchToken = 0

/** 覆盖全屏所需的揭示半径：圆心到视口四角的最大距离 */
function revealRadius(x: number, y: number): number {
  const dx = Math.max(x, window.innerWidth - x)
  const dy = Math.max(y, window.innerHeight - y)
  return Math.hypot(dx, dy)
}

/** 从 (x, y) 处圆形揭示地切换到目标模式 */
function reveal(next: ThemeMode, x: number, y: number): void {
  if (next === mode.value) return
  const doc = document as ViewTransitionDocument
  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const token = ++switchToken

  if (doc.startViewTransition && !reduceMotion) {
    root.style.setProperty('--yuna-tt-x', `${x}px`)
    root.style.setProperty('--yuna-tt-y', `${y}px`)
    root.style.setProperty('--yuna-tt-r', `${revealRadius(x, y)}px`)

    // 截帧之前就关掉全站元素过渡：旧帧不受影响，新帧更不会截到过渡中间态（旧色）
    root.classList.add('theme-switching')

    const transition = doc.startViewTransition(async () => {
      // 同步写入主题（html.dark / color-scheme）→ CSS 变量立即翻转，旧帧不受影响
      themeMode.setMode(next)
      // 只等微任务：Vue（含 Naive 主题重渲染）会在下一个微任务里把新配色写入 DOM。
      // 微任务之间浏览器不会绘制，故新帧截取时已是最终画面，既无闪屏也无文字延迟。
      // 切忌在此等待 requestAnimationFrame / setTimeout —— 那会让中间画面被真正绘制出来。
      await nextTick()
    })

    // 整段揭示动画期间保持过渡关闭，动画结束后再恢复（连续切换时只由最后一次收尾）
    const cleanup = (): void => {
      if (token === switchToken) root.classList.remove('theme-switching')
    }
    void transition.finished.then(cleanup, cleanup)
    return
  }

  root.classList.add('theme-anim')
  themeMode.setMode(next)
  window.setTimeout(() => {
    if (token === switchToken) root.classList.remove('theme-anim')
  }, 340)
}

/** 左键：按循环顺序取下一个模式 */
function toggle(event: MouseEvent): void {
  const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  // 键盘触发的 click 不带指针坐标（detail === 0），退回按钮中心
  const keyboard = event.detail === 0
  const x = keyboard && rect ? rect.left + rect.width / 2 : event.clientX
  const y = keyboard && rect ? rect.top + rect.height / 2 : event.clientY
  const index = ORDER.indexOf(mode.value)
  reveal(ORDER[(index + 1) % ORDER.length], x, y)
}

/** 右键：弹出统一风格的模式选择菜单 */
function openMenu(event: MouseEvent): void {
  const { clientX, clientY } = event
  const items: ContextMenuItem[] = ORDER.map((option) => ({
    key: option,
    label: LABELS[option],
    icon: option,
    checked: option === mode.value,
    onSelect: () => reveal(option, clientX, clientY),
  }))
  openContextMenu({ x: clientX, y: clientY, items })
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :title="title"
    :aria-label="title"
    aria-haspopup="menu"
    @click="toggle"
    @contextmenu.prevent="openMenu"
  >
    <!-- 自动：半明半暗 -->
    <svg
      v-if="mode === 'auto'"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
    </svg>

    <!-- 日间：太阳 -->
    <svg
      v-else-if="mode === 'light'"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6" />
      <path
        d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
      />
    </svg>

    <!-- 夜间：月牙 -->
    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 13.4A8 8 0 0 1 10.6 4a8 8 0 1 0 9.4 9.4z"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--yuna-gray-600);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.theme-toggle:hover {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle {
    transition: none;
  }
}
</style>
