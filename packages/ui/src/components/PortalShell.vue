<script setup lang="ts">
/**
 * 门户外壳：顶部导航 + 内容区 + 页脚，用于「公开门户」（无需登录）。
 *
 * 与 `AppShell`（控制台侧栏骨架）互补：门户面向未登录访客，横向导航更克制；
 * 组件本身不感知路由，导航项由调用方注入，点击通过 `navigate` 事件回传。
 */
interface PortalNavItem {
  label: string
  path: string
}

interface Props {
  /** 品牌主标题 */
  brandTitle?: string
  /** 品牌副标题 */
  brandTagline?: string
  /** 顶部导航项 */
  navItems?: PortalNavItem[]
  /** 当前路径，用于高亮导航项 */
  activePath?: string
  /** 页脚备注 */
  footerNote?: string
  /** 站点版本号 */
  version?: string
}

const props = withDefaults(defineProps<Props>(), {
  brandTitle: 'YunaNexus',
  brandTagline: '',
  navItems: () => [],
  activePath: '/',
  footerNote: '',
  version: '',
})

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const year = new Date().getFullYear()

function normalize(path: string): string {
  const trimmed = (path ?? '').trim()
  if (!trimmed || trimmed === '/') return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.replace(/\/+$/, '')
}

function isActive(path: string): boolean {
  const target = normalize(path)
  const current = normalize(props.activePath)
  if (target === '/') return current === '/'
  return current === target || current.startsWith(`${target}/`)
}
</script>

<template>
  <div class="yuna-portal">
    <header class="yuna-portal__header">
      <div class="yuna-portal__bar yuna-container">
        <button type="button" class="yuna-portal__brand" @click="emit('navigate', '/')">
          <slot name="logo">
            <span class="yuna-portal__mark">Y</span>
          </slot>
          <span class="yuna-portal__brand-text">
            <span class="yuna-portal__brand-title">{{ brandTitle }}</span>
            <span v-if="brandTagline" class="yuna-portal__brand-sub">{{ brandTagline }}</span>
          </span>
        </button>

        <nav class="yuna-portal__nav">
          <button
            v-for="item in navItems"
            :key="item.path"
            type="button"
            class="yuna-portal__nav-item"
            :class="{ 'is-active': isActive(item.path) }"
            @click="emit('navigate', item.path)"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="yuna-portal__actions">
          <slot name="actions" />
        </div>
      </div>
    </header>

    <main class="yuna-portal__main">
      <slot />
    </main>

    <footer class="yuna-portal__footer">
      <div class="yuna-portal__footer-inner yuna-container">
        <slot name="footer">
          <span>© {{ year }} {{ brandTitle }}</span>
          <span v-if="footerNote">{{ footerNote }}</span>
          <span v-if="version" class="yuna-portal__version">v{{ version }}</span>
        </slot>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.yuna-portal {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--yuna-surface);
}

/* ------------------------------- 顶部导航 ------------------------------- */

.yuna-portal__header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--yuna-glass);
  border-bottom: 1px solid var(--yuna-gray-200);
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.yuna-portal__bar {
  display: flex;
  align-items: center;
  gap: 24px;
  height: var(--yuna-header-height);
  padding: 0 24px;
}

.yuna-portal__brand {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: none;
}

.yuna-portal__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 15px;
  font-weight: 700;
  color: var(--yuna-blue-800);
  background: linear-gradient(135deg, var(--yuna-brand), var(--yuna-mint));
  border-radius: var(--yuna-radius-md);
}

.yuna-portal__brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;
}

.yuna-portal__brand-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.yuna-portal__brand-sub {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.yuna-portal__nav {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.yuna-portal__nav-item {
  position: relative;
  height: 32px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--yuna-gray-700);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.yuna-portal__nav-item:hover {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.yuna-portal__nav-item.is-active {
  color: var(--yuna-blue-700);
  font-weight: 500;
  background: var(--yuna-blue-50);
}

.yuna-portal__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

/* ------------------------------- 内容 / 页脚 ------------------------------- */

.yuna-portal__main {
  flex: 1 1 auto;
  background: linear-gradient(180deg, var(--yuna-blue-50) 0%, var(--yuna-surface) 320px);
}

.yuna-portal__footer {
  border-top: 1px solid var(--yuna-gray-200);
  background: var(--yuna-surface);
}

.yuna-portal__footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.yuna-portal__version {
  padding: 1px 8px;
  color: var(--yuna-gray-600);
  background: var(--yuna-gray-100);
  border-radius: 999px;
}

@media (max-width: 720px) {
  .yuna-portal__bar {
    gap: 12px;
    padding: 0 16px;
  }

  .yuna-portal__brand-sub {
    display: none;
  }

  /* 导航项较多时横向滚动，避免挤压品牌与操作区 */
  .yuna-portal__nav {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .yuna-portal__nav::-webkit-scrollbar {
    display: none;
  }

  .yuna-portal__nav-item {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
</style>
