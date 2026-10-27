<script setup lang="ts">
/**
 * 右键菜单图标：内置名 → 统一线宽 SVG；传入组件则直接渲染。
 *
 * 统一在这里维护的原因：右键菜单是"到处都在用"的通用设施，图标风格一旦分散，
 * 视觉上立刻露馅。内置集合只放菜单真正需要的语义图标。
 */
import { computed, type Component } from 'vue'
import type { ContextMenuIcon } from '../composables/use-context-menu'

const props = defineProps<{ name: ContextMenuIcon | Component }>()

const BUILTIN: Record<ContextMenuIcon, string> = {
  copy: 'M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3',
  cut: 'M6 4l9 12M18 4L9 16M8 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM22 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  paste: 'M9 4h6v3H9zM9 6H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2',
  selectAll: 'M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M8 12h8',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5',
  auto: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 3.5a8.5 8.5 0 0 1 0 17z',
  light: 'M12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zM12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6',
  dark: 'M20 13.4A8 8 0 0 1 10.6 4a8 8 0 1 0 9.4 9.4z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14',
  share: 'M8.5 13.5l7-4M8.5 10.5l7 4M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  link: 'M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.9 6.4M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4',
  rename: 'M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4zM14 6l4 4',
  delete: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  openTab: 'M4 6a2 2 0 0 1 2-2h5v2H6v12h12v-5h2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 4h6v6M20 4l-8 8',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  collapse: 'M6 9l6 6 6-6',
  expand: 'M6 15l6-6 6 6',
  export: 'M12 20V9M7.5 13.5L12 9l4.5 4.5M4 5h16',
}

const builtin = computed(() => (typeof props.name === 'string' ? BUILTIN[props.name] ?? '' : ''))
const isComponent = computed(() => typeof props.name !== 'string')
</script>

<template>
  <component :is="name" v-if="isComponent" :size="16" />
  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path :d="builtin" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
