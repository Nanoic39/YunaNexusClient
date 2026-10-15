<script setup lang="ts">
/**
 * 全局右键菜单面板 —— 单一实例，挂载于应用根节点。
 *
 * 职责：
 * 1. 接管浏览器右键：document 上监听 contextmenu，未被组件 preventDefault 的右键
 *    一律弹出默认菜单（复制 / 粘贴 / 刷新）；
 * 2. 渲染所有右键面板（默认菜单与组件自定义菜单共用同一套渲染与磨砂样式）。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  closeContextMenu,
  createDefaultContextMenuItems,
  openContextMenu,
  useContextMenu,
} from '../composables/use-context-menu'
import type { ContextMenuItem } from '../composables/use-context-menu'

const { state } = useContextMenu()

const menuRef = ref<HTMLElement | null>(null)
const pos = ref({ left: 0, top: 0 })
const placed = ref(false)

/** 依据光标位置摆放面板，并在贴边时向内翻转，保证完整可见 */
function placeMenu(): void {
  const el = menuRef.value
  const margin = 8
  let left = state.x
  let top = state.y
  if (el) {
    const { width, height } = el.getBoundingClientRect()
    if (left + width + margin > window.innerWidth) left = Math.max(margin, window.innerWidth - width - margin)
    if (top + height + margin > window.innerHeight) top = Math.max(margin, window.innerHeight - height - margin)
  }
  pos.value = { left, top }
}

watch(
  () => [state.visible, state.x, state.y] as const,
  async ([visible]) => {
    if (!visible) return
    placed.value = false
    await nextTick()
    placeMenu()
    placed.value = true
  },
)

/** 未特别设定的右键 → 弹出默认菜单 */
function onGlobalContextMenu(event: MouseEvent): void {
  if (event.defaultPrevented) return
  const target = event.target as Node | null
  if (menuRef.value && target && menuRef.value.contains(target)) return
  event.preventDefault()
  openContextMenu({ x: event.clientX, y: event.clientY, items: createDefaultContextMenuItems(event.target) })
}

function onDocPointerDown(event: MouseEvent): void {
  if (!state.visible) return
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) closeContextMenu()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeContextMenu()
}

function onScroll(): void {
  closeContextMenu()
}

function select(item: ContextMenuItem): void {
  if (item.disabled) return
  closeContextMenu()
  item.onSelect()
}

onMounted(() => {
  document.addEventListener('contextmenu', onGlobalContextMenu)
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onGlobalContextMenu)
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="yuna-ctx">
      <div
        v-if="state.visible"
        ref="menuRef"
        class="yuna-ctx"
        role="menu"
        :style="{
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          visibility: placed ? 'visible' : 'hidden',
        }"
        @contextmenu.prevent
      >
        <template v-for="item in state.items" :key="item.key">
          <div v-if="item.divider" class="yuna-ctx__divider" />
          <button
            type="button"
            class="yuna-ctx__item"
            :class="{ 'is-disabled': item.disabled, 'is-danger': item.danger }"
            role="menuitem"
            :disabled="item.disabled"
            @click="select(item)"
          >
            <span class="yuna-ctx__icon" aria-hidden="true">
              <!-- 复制 -->
              <svg v-if="item.icon === 'copy'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.6" />
                <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="1.6" />
              </svg>
              <!-- 粘贴 -->
              <svg v-else-if="item.icon === 'paste'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 4h6v2.5H9z" stroke="currentColor" stroke-width="1.6" />
                <path d="M9 5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.6" />
              </svg>
              <!-- 刷新 -->
              <svg v-else-if="item.icon === 'refresh'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 12a8 8 0 1 1-2.3-5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                <path d="M20 4v4.5h-4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- 自动 -->
              <svg v-else-if="item.icon === 'auto'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6" />
                <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
              </svg>
              <!-- 日间 -->
              <svg v-else-if="item.icon === 'light'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6" />
                <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              <!-- 夜间 -->
              <svg v-else-if="item.icon === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 13.4A8 8 0 0 1 10.6 4a8 8 0 1 0 9.4 9.4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
            </span>

            <span class="yuna-ctx__label">{{ item.label }}</span>

            <svg v-if="item.checked" class="yuna-ctx__check" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 半透明背景 + backdrop-filter，与通知面板 / 账号菜单统一为磨砂毛玻璃 */
.yuna-ctx {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  min-width: 152px;
  padding: 6px;
  background: var(--yuna-glass);
  border: 1px solid var(--yuna-glass-border);
  border-radius: 12px;
  box-shadow: var(--yuna-glass-shadow);
  transform-origin: top left;
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.yuna-ctx__divider {
  height: 1px;
  margin: 5px 8px;
  background: var(--yuna-glass-border);
}

.yuna-ctx__item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--yuna-gray-800);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.yuna-ctx__item:hover:not(.is-disabled) {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.yuna-ctx__item.is-disabled {
  color: var(--yuna-gray-500);
  cursor: not-allowed;
}

.yuna-ctx__item.is-danger {
  color: var(--yuna-danger);
}

.yuna-ctx__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  color: inherit;
}

.yuna-ctx__label {
  flex: 1 1 auto;
}

.yuna-ctx__check {
  flex: 0 0 auto;
  color: var(--yuna-primary);
}

.yuna-ctx-enter-active {
  animation: yuna-ctx-in 0.2s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.yuna-ctx-leave-active {
  animation: yuna-ctx-out 0.14s ease-in both;
}

@keyframes yuna-ctx-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes yuna-ctx-out {
  from {
    opacity: 1;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(0.96);
  }
}

@media (prefers-reduced-motion: reduce) {
  .yuna-ctx,
  .yuna-ctx__item {
    transition: none;
    animation-duration: 0.01ms;
  }
}
</style>
