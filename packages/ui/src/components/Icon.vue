<script setup lang="ts">
/**
 * 唯一图标出口。
 *
 * 全站图标必须从这里取，禁止使用 emoji 或第三方图标字体：
 * - emoji 在不同系统渲染差异大，无法控制描边与颜色
 * - 图标字体体积大且不可按需 tree-shake
 *
 * 新增图标只在此处补一条 path 映射，页面不要内联 SVG。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 图标名，见下方 ICONS */
    name: string
    /** 像素尺寸，默认 16 */
    size?: number
  }>(),
  { size: 16 },
)

/** path 映射：统一 24×24 视图框、1.6 描边、无填充 */
const ICONS: Record<string, string> = {
  dashboard: 'M3 12h7V3H3zM14 21h7v-9h-7zM14 3h7v6h-7zM3 21h7v-6H3z',
  users:
    'M8 11a3.2 3.2 0 100-6.4A3.2 3.2 0 008 11zM2.5 20c0-3.4 2.5-5.2 5.5-5.2s5.5 1.8 5.5 5.2M17 11a2.6 2.6 0 100-5.2',
  shield: 'M12 3l7 3v5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z',
  key: 'M14.5 9.5a4 4 0 11-3.2 6.4L4 23l-1.5-1.5 2-2L3 18l2-2 1.5 1.5 2-2',
  menu: 'M4 6h16M4 12h16M4 18h10',
  layers: 'M12 3l8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4',
  building: 'M4 21V6l8-3 8 3v15M9 21v-5h6v5M8 9h2M14 9h2M8 13h2M14 13h2',
  file: 'M6 3h8l4 4v14H6zM14 3v5h5',
  bell: 'M6 9a6 6 0 1112 0v5l2 3H4l2-3zM10 20a2 2 0 004 0',
  search: 'M11 17.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM16 16l4.5 4.5',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z',
  theme: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0111.6-2L20 8M4 16l2.3 3A7 7 0 0018 17',
  tea: 'M5 10h12v5a5 5 0 01-5 5H10a5 5 0 01-5-5v-5zM17 11h2a3 3 0 010 6h-2M3 22h17M8 7V4M12 7V2M16 7V4',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  logout: 'M10 4H4v16h6M13 8l4 4-4 4M8 12h13',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
}

const path = computed(() => ICONS[props.name] ?? '')
</script>

<template>
  <svg
    class="yuna-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" />
  </svg>
</template>

<style scoped>
.yuna-icon {
  display: block;
  flex: none;
}
</style>
