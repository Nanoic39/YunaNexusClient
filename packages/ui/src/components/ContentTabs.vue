<script setup lang="ts">
/**
 * 内容页签栏：多标签导航的可视层。
 *
 * 只做两件事：渲染 + 把交互意图抛给父级（父级持有 `useContentTabs` 状态）。
 * 右键菜单在本组件内构建，因为"哪个页签被右键"只有这里知道。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { openContextMenu } from '../composables/use-context-menu'
import type { ContextMenuItem } from '../composables/use-context-menu'
import type { ContentTab } from '../composables/use-content-tabs'

const props = defineProps<{
  tabs: ContentTab[]
  activeKey: string | null
  hasClosableOthers: (key: string) => boolean
  hasClosableRight: (key: string) => boolean
}>()

const emit = defineEmits<{
  (e: 'activate', key: string): void
  (e: 'close', key: string): void
  (e: 'close-others', key: string): void
  (e: 'close-right', key: string): void
  (e: 'close-all'): void
  (e: 'toggle-pin', key: string): void
  (e: 'refresh', key: string): void
}>()

const stripRef = ref<HTMLElement | null>(null)

/** 激活页签后把它滚进可视区，避免页签多到溢出时"激活了却看不见" */
watch(
  () => props.activeKey,
  async (key) => {
    if (!key) return
    await nextTick()
    const strip = stripRef.value
    const target = strip?.querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(key)}"]`)
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
)

const closeable = computed(() => props.tabs.some((tab) => tab.closable && !tab.pinned))

function buildMenu(tab: ContentTab): ContextMenuItem[] {
  const fixed = tab.pinned
  return [
    {
      key: 'refresh',
      label: '刷新当前页签',
      icon: 'refresh',
      disabled: tab.key !== props.activeKey,
      onSelect: () => emit('refresh', tab.key),
    },
    { key: 'divider-1', divider: true },
    {
      key: 'close',
      label: '关闭',
      icon: 'delete',
      shortcut: 'Alt+W',
      disabled: fixed || !tab.closable || props.tabs.length <= 1,
      onSelect: () => emit('close', tab.key),
    },
    {
      key: 'close-others',
      label: '关闭其他',
      disabled: !props.hasClosableOthers(tab.key),
      onSelect: () => emit('close-others', tab.key),
    },
    {
      key: 'close-right',
      label: '关闭右侧全部',
      disabled: !props.hasClosableRight(tab.key),
      onSelect: () => emit('close-right', tab.key),
    },
    {
      key: 'close-all',
      label: '关闭全部可关闭页签',
      disabled: !closeable.value,
      onSelect: () => emit('close-all'),
    },
    { key: 'divider-2', divider: true },
    {
      key: 'pin',
      label: fixed ? '取消固定' : '固定页签',
      icon: fixed ? 'collapse' : 'expand',
      checked: fixed,
      onSelect: () => emit('toggle-pin', tab.key),
    },
    {
      key: 'copy-link',
      label: '复制链接',
      icon: 'link',
      onSelect: () => {
        void navigator.clipboard
          ?.writeText(new URL(tab.key, window.location.origin).href)
          .catch(() => {})
      },
    },
  ]
}

function onTabContextMenu(event: MouseEvent, tab: ContentTab): void {
  event.preventDefault()
  event.stopPropagation()
  openContextMenu({ x: event.clientX, y: event.clientY, items: buildMenu(tab), opener: null })
}

/** 中键点击关闭（浏览器标签页的既有习惯） */
function onAuxClick(event: MouseEvent, tab: ContentTab): void {
  if (event.button !== 1) return
  event.preventDefault()
  if (!tab.pinned && tab.closable && props.tabs.length > 1) emit('close', tab.key)
}
</script>

<template>
  <div class="yuna-tabs" role="tablist" aria-label="已打开页面">
    <div ref="stripRef" class="yuna-tabs__strip">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="yuna-tabs__tab"
        :class="{ 'is-active': tab.key === activeKey, 'is-pinned': tab.pinned }"
        :data-tab-key="tab.key"
        role="tab"
        :aria-selected="tab.key === activeKey"
        tabindex="0"
        @click="emit('activate', tab.key)"
        @keydown.enter.prevent="emit('activate', tab.key)"
        @keydown.space.prevent="emit('activate', tab.key)"
        @auxclick="onAuxClick($event, tab)"
        @contextmenu="onTabContextMenu($event, tab)"
      >
        <span v-if="tab.pinned" class="yuna-tabs__pin" aria-label="已固定">•</span>
        <span class="yuna-tabs__label">{{ tab.label }}</span>
        <button
          v-if="!tab.pinned && tab.closable && tabs.length > 1"
          type="button"
          class="yuna-tabs__close"
          :aria-label="`关闭 ${tab.label}`"
          @click.stop="emit('close', tab.key)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yuna-tabs {
  display: flex;
  align-items: center;
  flex: 0 0 36px;
  min-height: 36px;
  min-width: 0;
  padding: 0 12px;
  overflow: hidden;
  border-bottom: 1px solid var(--yuna-gray-200);
  background: var(--yuna-card-bg);
}

.yuna-tabs__strip {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.yuna-tabs__strip::-webkit-scrollbar {
  display: none;
}

.yuna-tabs__tab {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  align-items: center;
  max-width: 200px;
  height: 28px;
  padding: 0 8px 0 10px;
  font-size: 13px;
  color: var(--yuna-gray-700, var(--yuna-gray-800));
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--yuna-radius-sm);
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.yuna-tabs__tab:hover {
  background: var(--yuna-gray-100);
}

.yuna-tabs__tab.is-active {
  font-weight: 600;
  color: var(--yuna-primary);
  background: color-mix(in srgb, var(--yuna-primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--yuna-primary) 28%, transparent);
}

.yuna-tabs__tab.is-pinned .yuna-tabs__label {
  font-weight: 600;
}

.yuna-tabs__pin {
  font-size: 16px;
  line-height: 1;
  color: var(--yuna-primary);
}

.yuna-tabs__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yuna-tabs__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--yuna-gray-500);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 5px;
}

.yuna-tabs__close:hover {
  color: var(--yuna-danger);
  background: color-mix(in srgb, var(--yuna-danger) 12%, transparent);
}
</style>
