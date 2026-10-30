<script setup lang="ts">
/**
 * 全局右键菜单面板 —— 单一实例，挂载于应用根节点。
 *
 * 职责：
 * 1. **兜底接管**：document 上监听 contextmenu，未被 `v-context-menu` 指令或组件
 *    自行 `preventDefault` 的右键，按"可编辑区 → 通用菜单"回退，绝不出现浏览器原生菜单；
 * 2. **统一渲染**：所有右键面板（页面自定义、区域提供者、兜底）共用一套磨砂样式、
 *    一套键盘交互与一套贴边翻转逻辑，这就是"风格统一"的落点；
 * 3. **交互完整性**：方向键/回车/Esc、Tab 移出即关闭、滚动或缩放即关闭、
 *    点击外部即关闭、焦点归还；
 * 4. 触摸设备长按等价于右键（避免移动端完全没有入口）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  closeContextMenu,
  openContextMenu,
  resolveContextMenuItems,
  useContextMenu,
  type ContextMenuItem,
} from '../composables/use-context-menu'
import ContextMenuList from './ContextMenuList.vue'

const { state } = useContextMenu()

const panelRef = ref<HTMLElement | null>(null)
const pos = ref({ left: 0, top: 0 })
/** 面板展开原点：跟随光标在面板内的位置，使动画"从点击处生长" */
const origin = ref('top left')
const placed = ref(false)
const opening = ref(false)

const visible = computed(() => state.visible)

/** 依据光标位置摆放面板，贴边时向内翻转，保证完整可见 */
function placeMenu(): void {
  const el = panelRef.value
  const margin = 8
  let left = state.x
  let top = state.y
  if (el) {
    const { width, height } = el.getBoundingClientRect()
    if (left + width + margin > window.innerWidth) left = Math.max(margin, window.innerWidth - width - margin)
    if (top + height + margin > window.innerHeight) top = Math.max(margin, window.innerHeight - height - margin)
  }
  pos.value = { left, top }
  // 光标相对面板的位置：贴边翻转后可能落在面板右/下侧，原点随之翻转
  const w = el?.offsetWidth || 1
  const h = el?.offsetHeight || 1
  const ox = Math.min(Math.max(state.x - left, 0), w)
  const oy = Math.min(Math.max(state.y - top, 0), h)
  origin.value = `${ox}px ${oy}px`
}

watch(
  () => [state.visible, state.x, state.y] as const,
  async ([open]) => {
    if (!open) return
    placed.value = false
    opening.value = false
    await nextTick()
    placeMenu()
    placed.value = true
    // 下一帧才加动画类：避免元素还在 visibility:hidden 时动画已经跑完
    requestAnimationFrame(() => {
      opening.value = true
    })
    // 焦点进入面板，键盘用户可以直接用方向键
    panelRef.value?.querySelector<HTMLElement>('.yuna-ctx-list__item')?.focus({ preventScroll: true })
  },
)

/** 兜底：未声明区域的右键 → 区域提供者（若元素在 [data-context-menu] 内）→ 默认菜单 */
function onGlobalContextMenu(event: MouseEvent): void {
  if (event.defaultPrevented) return
  const target = event.target
  if (!(target instanceof Element)) return
  if (panelRef.value && panelRef.value.contains(target)) return

  const owner = target.closest<HTMLElement>('[data-context-kind]')
  const kind = owner?.dataset.contextKind ?? 'global'
  const items = resolveContextMenuItems({
    kind,
    payload: owner ? undefined : null,
    event,
    target,
  })
  // 标记为"已处理"，让指令的冒泡不再重复弹出
  event.preventDefault()
  openContextMenu({ x: event.clientX, y: event.clientY, items, opener: null })
}

function onDocPointerDown(event: MouseEvent): void {
  if (!visible.value) return
  if (panelRef.value && !panelRef.value.contains(event.target as Node)) closeContextMenu()
}

function onKeydown(event: KeyboardEvent): void {
  if (!visible.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeContextMenu()
    return
  }
  // Tab 离开面板即关闭，避免焦点跑到面板背后但菜单还挂着
  if (event.key === 'Tab') closeContextMenu()
}

function onViewportChange(): void {
  closeContextMenu()
}

/* ---------------------------------------------------------------- 触摸长按 */

const LONG_PRESS_MS = 500
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pressStart: { x: number; y: number } | null = null

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1) return
  const touch = event.touches[0]
  const target = event.target
  if (!(target instanceof Element)) return
  pressStart = { x: touch.clientX, y: touch.clientY }
  if (pressTimer) clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    if (!pressStart) return
    const owner = target.closest<HTMLElement>('[data-context-kind]')
    const kind = owner?.dataset.contextKind ?? 'global'
    const items = resolveContextMenuItems({
      kind,
      payload: null,
      event: new MouseEvent('contextmenu', { clientX: pressStart.x, clientY: pressStart.y }),
      target,
    })
    openContextMenu({ x: pressStart.x, y: pressStart.y, items, opener: null })
    pressStart = null
  }, LONG_PRESS_MS)
}

function onTouchEnd(): void {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  pressStart = null
}

function onTouchMove(event: TouchEvent): void {
  if (!pressStart || event.touches.length !== 1) return
  const touch = event.touches[0]
  // 移动超过 10px 视为滚动，取消长按
  if (Math.abs(touch.clientX - pressStart.x) > 10 || Math.abs(touch.clientY - pressStart.y) > 10) onTouchEnd()
}

/* ---------------------------------------------------------------- 选择 */

function select(item: ContextMenuItem): void {
  if (item.disabled) return
  closeContextMenu()
  void item.onSelect?.()
}

onMounted(() => {
  document.addEventListener('contextmenu', onGlobalContextMenu)
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
  document.addEventListener('touchend', onTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onGlobalContextMenu)
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  onTouchEnd()
})
</script>

<template>
  <Teleport to="body">
    <div
        v-if="visible"
        ref="panelRef"
        class="yuna-ctx"
        :class="{ 'is-opening': opening }"
        :style="{
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          visibility: placed ? 'visible' : 'hidden',
          '--ctx-origin': origin,
        }"
        @contextmenu.prevent
      >
        <ContextMenuList :items="state.items" :level="1" @select="select" />
    </div>
  </Teleport>
</template>

<style scoped>
.yuna-ctx.is-opening :deep(.yuna-ctx-list) {
  animation: yuna-ctx-content 0.18s ease-out 0.08s both;
}

@keyframes yuna-ctx-content {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

/* 浮层玻璃：比内容卡更透、模糊更强，才有"浮在内容之上"的观感 */
.yuna-ctx {
  position: fixed;
  z-index: 9999;
  min-width: 176px;
  max-width: 320px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 16px 40px rgba(15, 23, 42, 0.16),
    0 2px 6px rgba(15, 23, 42, 0.08);
  transform-origin: var(--ctx-origin, top left);
  will-change: transform, opacity, border-radius;
  -webkit-backdrop-filter: saturate(180%) blur(8px);
  backdrop-filter: saturate(180%) blur(8px);
}

html.dark .yuna-ctx,
html[data-theme='dark'] .yuna-ctx {
  background: rgba(21, 27, 35, 0.72);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 16px 40px rgba(0, 0, 0, 0.5);
}

.yuna-ctx.is-opening {
  animation: yuna-ctx-in 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}


@keyframes yuna-ctx-in {
  from {
    opacity: 0;
    transform: scale(0.2);
    border-radius: 18px;
  }

  55% {
    opacity: 1;
  }

  to {
    opacity: 1;
    transform: scale(1);
    border-radius: 12px;
  }
}


@media (prefers-reduced-motion: reduce) {
  .yuna-ctx.is-opening {
    animation-duration: 0.01ms;
  }
}
</style>
