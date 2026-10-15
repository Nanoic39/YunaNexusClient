<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  NBreadcrumb,
  NBreadcrumbItem,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
} from 'naive-ui'
import type { MenuOption } from 'naive-ui'

/**
 * 中控台布局外壳：浅色白底侧栏 + 极简顶栏 + 内容区。
 *
 * 只负责骨架与间距，不感知具体业务；菜单项、顶栏动作、Logo 均由调用方通过
 * props / 具名插槽注入，保证用户端与管理端可复用同一套布局。
 */
interface Props {
  /** Naive `NMenu` 菜单项（支持嵌套 children） */
  menuOptions: MenuOption[]
  /** 当前激活菜单 key */
  value?: string | null
  /** 侧栏折叠态 */
  collapsed?: boolean
  /** 品牌主标题 */
  brandTitle?: string
  /** 品牌副标题（折叠时自动隐藏） */
  brandSubtitle?: string
  /** 是否在顶栏展示由菜单推导的面包屑（提供 header-left 插槽时自动让位） */
  showBreadcrumb?: boolean
  /** 品牌区是否可点击（可点击时触发 brand-click，并呈现 hover 反馈） */
  brandInteractive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: null,
  collapsed: false,
  brandTitle: 'YunaNexus',
  brandSubtitle: '',
  showBreadcrumb: true,
  brandInteractive: false,
})

const emit = defineEmits<{
  (e: 'update:value', value: string): void
  (e: 'update:collapsed', value: boolean): void
  (e: 'brand-click'): void
}>()

interface Crumb {
  key: string
  label: string
}

/** 依据菜单树推导当前路由的层级路径，用于顶栏面包屑 */
function findTrail(options: MenuOption[], target: string | null): Crumb[] {
  if (!target) return []
  const trail: Crumb[] = []
  const walk = (list: MenuOption[], acc: Crumb[]): boolean => {
    for (const option of list) {
      const label = typeof option.label === 'string' ? option.label : ''
      const key = option.key != null ? String(option.key) : ''
      const next = label ? [...acc, { key, label }] : acc
      if (key === target) {
        trail.push(...next)
        return true
      }
      const children = (option as { children?: MenuOption[] }).children
      if (children?.length && walk(children, next)) return true
    }
    return false
  }
  walk(options, [])
  return trail
}

const crumbs = computed(() => findTrail(props.menuOptions, props.value))

/**
 * 移动端：侧栏由「常驻 + 折叠」转为「覆盖式抽屉 + 遮罩」，避免窄屏被侧栏挤占内容。
 * 断点与全局的 `@media (max-width: 768px)` 保持一致。
 */
const MOBILE_QUERY = '(max-width: 768px)'
/** 同步初始化，避免窄屏首帧先按桌面布局渲染再切换造成的闪烁 */
const mobileQuery = window.matchMedia(MOBILE_QUERY)
const isMobile = ref(mobileQuery.matches)
const drawerOpen = ref(false)
/** 抽屉态下侧栏始终保持展开，图标与文字齐全 */
const siderCollapsed = computed(() => (isMobile.value ? false : props.collapsed))

function syncMobile(matches: boolean): void {
  isMobile.value = matches
  // 回到桌面尺寸时收起抽屉，避免残留遮罩
  if (!matches) drawerOpen.value = false
}

function onMediaChange(event: MediaQueryListEvent): void {
  syncMobile(event.matches)
}

function onSelect(key: string): void {
  emit('update:value', key)
  // 移动端选中菜单后自动收起抽屉
  if (isMobile.value) drawerOpen.value = false
}

function toggleCollapsed(): void {
  if (isMobile.value) {
    drawerOpen.value = !drawerOpen.value
    return
  }
  emit('update:collapsed', !props.collapsed)
}

function closeDrawer(): void {
  drawerOpen.value = false
}

function onBrandClick(): void {
  if (props.brandInteractive) emit('brand-click')
}

onMounted(() => {
  mobileQuery.addEventListener('change', onMediaChange)
})

onBeforeUnmount(() => {
  mobileQuery.removeEventListener('change', onMediaChange)
})
</script>

<template>
  <n-layout
    has-sider
    class="yuna-shell"
    :class="{ 'is-mobile': isMobile, 'is-drawer-open': drawerOpen }"
  >
    <n-layout-sider
      collapse-mode="width"
      :collapsed-width="64"
      :width="216"
      :collapsed="siderCollapsed"
      :native-scrollbar="false"
      class="yuna-shell__sider"
    >
      <div class="yuna-shell__sider-inner">
        <component
          :is="brandInteractive ? 'button' : 'div'"
          class="yuna-shell__brand"
          :class="{ 'is-interactive': brandInteractive }"
          :type="brandInteractive ? 'button' : undefined"
          @click="onBrandClick"
        >
          <slot name="logo">
            <span class="yuna-shell__brand-mark">Y</span>
          </slot>
          <span v-if="!siderCollapsed" class="yuna-shell__brand-text">
            <span class="yuna-shell__brand-title">{{ brandTitle }}</span>
            <span v-if="brandSubtitle" class="yuna-shell__brand-sub">{{ brandSubtitle }}</span>
          </span>
        </component>

        <div class="yuna-shell__menu">
          <n-menu
            :value="value"
            :options="menuOptions"
            :collapsed="siderCollapsed"
            :collapsed-width="64"
            :collapsed-icon-size="18"
            :indent="18"
            :root-indent="18"
            @update:value="onSelect"
          />
        </div>

        <div v-if="$slots['sider-footer']" class="yuna-shell__sider-foot">
          <slot name="sider-footer" />
        </div>
      </div>
    </n-layout-sider>

    <!-- 移动端抽屉遮罩：点击关闭 -->
    <Transition name="yuna-mask">
      <div v-if="isMobile && drawerOpen" class="yuna-shell__mask" @click="closeDrawer" />
    </Transition>

    <n-layout class="yuna-shell__main">
      <header class="yuna-shell__header">
        <div class="yuna-shell__header-left">
          <button
            type="button"
            class="yuna-shell__toggle"
            :title="isMobile ? '打开导航' : collapsed ? '展开导航' : '收起导航'"
            @click="toggleCollapsed"
          >
            <!-- 移动端：抽屉入口用汉堡图标 -->
            <svg
              v-if="isMobile"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            <svg
              v-else
              class="yuna-shell__toggle-icon"
              :class="{ 'is-collapsed': collapsed }"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <slot name="header-left">
            <n-breadcrumb v-if="showBreadcrumb && crumbs.length" class="yuna-shell__crumbs">
              <n-breadcrumb-item v-for="crumb in crumbs" :key="crumb.key">
                {{ crumb.label }}
              </n-breadcrumb-item>
            </n-breadcrumb>
          </slot>
        </div>

        <div class="yuna-shell__header-right">
          <slot name="header-actions" />
        </div>
      </header>

      <n-layout-content class="yuna-shell__content" :native-scrollbar="false">
        <div class="yuna-shell__page">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.yuna-shell {
  height: 100vh;
}

/* 浅色白底侧栏：与顶栏、内容区同一套表面色，菜单走 Naive 主题默认配色 */
.yuna-shell__sider {
  background: var(--yuna-surface);
  border-right: 1px solid var(--yuna-gray-200);
}

.yuna-shell__sider :deep(.n-layout-sider-scroll-container) {
  height: 100%;
  background: transparent;
}

/* 侧栏内部采用纵向三段式：品牌 / 菜单（可滚动）/ 底部扩展 */
.yuna-shell__sider-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.yuna-shell__menu {
  flex: 1 1 auto;
  min-height: 0;
  padding: 10px 0;
  overflow-y: auto;
}

.yuna-shell__sider-foot {
  flex: 0 0 auto;
  padding: 8px;
  border-top: 1px solid var(--yuna-gray-200);
}

.yuna-shell__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: var(--yuna-header-height);
  padding: 0 18px;
  overflow: hidden;
  font: inherit;
  color: inherit;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--yuna-gray-200);
}

/* 可点击品牌（如用户端 Logo → 门户）：给出指针与 hover 反馈 */
.yuna-shell__brand.is-interactive {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.yuna-shell__brand.is-interactive:hover {
  background: var(--yuna-gray-100);
}

.yuna-shell__brand-mark {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(140deg, var(--yuna-blue-500) 0%, var(--yuna-blue-600) 100%);
  border: none;
  border-radius: var(--yuna-radius-md);
}

.yuna-shell__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.yuna-shell__brand-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.yuna-shell__brand-sub {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

/* 顶栏悬浮于内容之上：内容滚动到底下时透出磨砂模糊。
   注意：backdrop-filter 必须放在 ::before 伪元素上，不能直接放在 header 上 ——
   带 backdrop-filter 的元素会成为「backdrop root」，其内部后代元素（通知面板 /
   账号菜单）的 backdrop-filter 只能采样到该元素自身，导致面板完全看不到模糊。
   伪元素以 z-index:-1 铺底，header 自身背景透明，面板因此可采样到顶栏背后的页面。 */
.yuna-shell__header {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--yuna-header-height);
  padding: 0 16px 0 12px;
  background: transparent;
  border-bottom: 1px solid var(--yuna-glass-border);
}

.yuna-shell__header::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  content: '';
  background: var(--yuna-glass);
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.yuna-shell__header-left,
.yuna-shell__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.yuna-shell__crumbs {
  margin-left: 4px;
}

.yuna-shell__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--yuna-gray-600);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.yuna-shell__toggle:hover {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.yuna-shell__toggle-icon {
  transition: transform 0.2s ease;
}

.yuna-shell__toggle-icon.is-collapsed {
  transform: rotate(180deg);
}

/* 主区为顶栏绝对定位提供锚点 */
.yuna-shell__main {
  position: relative;
}

/* 内容区占满视口：页面顶部预留顶栏高度，滚动时内容穿过顶栏下方透出磨砂 */
.yuna-shell__content {
  height: 100vh;
}

.yuna-shell__page {
  min-height: 100%;
  padding-top: var(--yuna-header-height);
  background: var(--yuna-canvas);
}

/* ----------------------------- 移动端适配 ----------------------------- */

/*
 * 窄屏下侧栏脱离文档流，转为覆盖式抽屉：从左侧滑入 + 遮罩。
 * 因抽屉固定定位不再参与 flex 布局，主区自动占满整宽。
 */
.yuna-shell.is-mobile .yuna-shell__sider {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  width: 216px !important;
  max-width: 82vw !important;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: var(--yuna-glass-shadow);
}

.yuna-shell.is-mobile.is-drawer-open .yuna-shell__sider {
  transform: translateX(0);
}

.yuna-shell__mask {
  position: fixed;
  inset: 0;
  z-index: 25;
  background: rgba(15, 18, 24, 0.42);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.yuna-mask-enter-active,
.yuna-mask-leave-active {
  transition: opacity 0.24s ease;
}

.yuna-mask-enter-from,
.yuna-mask-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .yuna-shell__header {
    padding: 0 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .yuna-shell.is-mobile .yuna-shell__sider {
    transition: none;
  }

  .yuna-mask-enter-active,
  .yuna-mask-leave-active {
    transition: none;
  }
}
</style>
