<script setup lang="ts">
/**
 * 右键菜单的一层列表（递归渲染子菜单）。
 *
 * 分层拆开的原因：子菜单需要独立的键盘游标、独立的开合状态与独立的贴边翻转，
 * 放在一个组件里用下标数组维护会难读且易错，递归组件则天然对齐数据结构。
 */
import { nextTick, onMounted, ref, watch } from 'vue'
import type { ContextMenuItem } from '../composables/use-context-menu'
import { moveActive } from '../composables/use-context-menu'
import ContextMenuIconGlyph from './ContextMenuIconGlyph.vue'

const props = withDefaults(defineProps<{ items: ContextMenuItem[]; level?: number }>(), {
  level: 1,
})

const emit = defineEmits<{
  (e: 'select', item: ContextMenuItem): void
  (e: 'back'): void
}>()

const active = ref(-1)
const openIndex = ref(-1)
const submenuFlip = ref(false)
const submenuRef = ref<{ $el?: HTMLElement } | null>(null)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

function clearHoverTimer(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer)
    hoverTimer = null
  }
}

function closeSubmenu(): void {
  clearHoverTimer()
  openIndex.value = -1
  submenuFlip.value = false
}

function openSubmenu(index: number): void {
  const item = props.items[index]
  if (!item?.children?.length) {
    closeSubmenu()
    return
  }
  openIndex.value = index
  active.value = index
  void nextTick(() => {
    const panel = submenuRef.value?.$el
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    // 右侧放不下就翻到左侧，避免子菜单被窗口裁掉
    submenuFlip.value = rect.right > window.innerWidth - 8
    if (rect.bottom > window.innerHeight - 8) {
      panel.style.top = `${Math.min(0, window.innerHeight - 8 - rect.height)}px`
    }
  })
}

function hover(index: number): void {
  const item = props.items[index]
  if (item.header) return
  active.value = index
  clearHoverTimer()
  if (item.children?.length) {
    hoverTimer = setTimeout(() => openSubmenu(index), 90)
  } else if (openIndex.value !== -1) {
    closeSubmenu()
  }
}

function activate(index: number): void {
  const item = props.items[index]
  if (!item || item.disabled || item.header) return
  if (item.children?.length) {
    openSubmenu(index)
    return
  }
  emit('select', item)
}

function onKeydown(event: KeyboardEvent): void {
  const key = event.key
  if (key === 'ArrowDown' || key === 'ArrowUp') {
    event.preventDefault()
    active.value = moveActive(props.items, active.value, key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (key === 'Home' || key === 'End') {
    event.preventDefault()
    active.value = key === 'Home' ? 0 : props.items.length - 1
    return
  }
  if (key === 'ArrowRight') {
    const item = props.items[active.value]
    if (item?.children?.length) {
      event.preventDefault()
      openSubmenu(active.value)
    }
    return
  }
  if (key === 'ArrowLeft') {
    if (props.level > 1) {
      event.preventDefault()
      event.stopPropagation()
      emit('back')
    }
    return
  }
  if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    activate(active.value)
  }
}

/** 函数式 ref：v-for 内的 ref 会收集成数组，这里只保留当前打开的那一个 */
function setSubmenuRef(target: unknown): void {
  submenuRef.value = (target as { $el?: HTMLElement } | null) ?? null
}

function onSubmenuBack(): void {
  closeSubmenu()
  active.value = openIndex.value >= 0 ? openIndex.value : active.value
}

onMounted(() => {
  // 打开后默认高亮第一个可选项，键盘用户无需先按方向键
  active.value = moveActive(props.items, -1, 1)
})

watch(
  () => props.items,
  () => {
    active.value = moveActive(props.items, -1, 1)
    closeSubmenu()
  },
)
</script>

<template>
  <div class="yuna-ctx-list" role="menu" :aria-label="level > 1 ? '子菜单' : '右键菜单'" @keydown="onKeydown">
    <template v-for="(item, index) in items" :key="item.key">
      <div v-if="item.divider" class="yuna-ctx-list__divider" role="separator" />
      <div v-if="item.header" class="yuna-ctx-list__header" role="presentation">{{ item.label }}</div>
      <div v-else class="yuna-ctx-list__row">
        <button
          type="button"
          class="yuna-ctx-list__item"
          :class="{
            'is-active': active === index,
            'is-disabled': item.disabled,
            'is-danger': item.danger,
          }"
          role="menuitem"
          :aria-disabled="item.disabled ? 'true' : undefined"
          :aria-haspopup="item.children?.length ? 'menu' : undefined"
          :aria-expanded="item.children?.length ? openIndex === index : undefined"
          :disabled="item.disabled"
          @mouseenter="hover(index)"
          @mouseleave="clearHoverTimer"
          @click="activate(index)"
        >
          <span class="yuna-ctx-list__icon" aria-hidden="true">
            <ContextMenuIconGlyph v-if="item.icon" :name="item.icon" />
          </span>
          <span class="yuna-ctx-list__label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="yuna-ctx-list__shortcut">{{ item.shortcut }}</span>
          <svg
            v-if="item.children?.length"
            class="yuna-ctx-list__chevron"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg
            v-else-if="item.checked"
            class="yuna-ctx-list__check"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <ContextMenuList
          v-if="openIndex === index && item.children?.length"
          :ref="setSubmenuRef"
          class="yuna-ctx-list__submenu"
          :class="{ 'is-flipped': submenuFlip }"
          :items="item.children"
          :level="level + 1"
          @select="emit('select', $event)"
          @back="onSubmenuBack"
        />
      </div>
    </template>
    <span v-if="!items.length" class="yuna-ctx-list__empty">没有可用操作</span>
  </div>
</template>

<style scoped>
.yuna-ctx-list {
  display: flex;
  flex-direction: column;
  min-width: 168px;
  padding: 6px;
  outline: none;
}

.yuna-ctx-list__row {
  position: relative;
}

.yuna-ctx-list__divider {
  height: 1px;
  margin: 5px 8px;
  background: var(--yuna-glass-border);
}

.yuna-ctx-list__header {
  padding: 6px 10px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--yuna-gray-500);
  text-transform: uppercase;
}

.yuna-ctx-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
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

.yuna-ctx-list__item.is-active:not(.is-disabled),
.yuna-ctx-list__item:hover:not(.is-disabled) {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.yuna-ctx-list__item.is-disabled {
  color: var(--yuna-gray-500);
  cursor: not-allowed;
}

.yuna-ctx-list__item.is-danger:not(.is-disabled) {
  color: var(--yuna-danger);
}

.yuna-ctx-list__item.is-danger.is-active:not(.is-disabled) {
  background: color-mix(in srgb, var(--yuna-danger) 12%, transparent);
}

.yuna-ctx-list__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  color: inherit;
}

.yuna-ctx-list__label {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yuna-ctx-list__shortcut {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--yuna-gray-500);
  font-variant-numeric: tabular-nums;
}

.yuna-ctx-list__chevron,
.yuna-ctx-list__check {
  flex: 0 0 auto;
  color: var(--yuna-primary);
}

.yuna-ctx-list__empty {
  padding: 6px 10px;
  font-size: 12px;
  color: var(--yuna-gray-500);
}

.yuna-ctx-list__submenu {
  position: absolute;
  top: -6px;
  left: 100%;
  z-index: 1;
  margin-left: 2px;
  background: var(--yuna-glass);
  border: 1px solid var(--yuna-glass-border);
  border-radius: 12px;
  box-shadow: var(--yuna-glass-shadow);
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.yuna-ctx-list__submenu.is-flipped {
  right: 100%;
  left: auto;
  margin-right: 2px;
  margin-left: 0;
}
</style>
