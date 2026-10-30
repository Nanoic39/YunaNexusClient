<script setup lang="ts">
/**
 * 管理端外壳。
 *
 * 结构固定为「侧栏 236/64 + 顶栏 56 + 内容区」，所有页面共用：
 * - 折叠与日夜切换在此集中处理，页面内不再重复实现
 * - 不提供面包屑：侧栏选中态已表达位置
 * - 图标统一走 Icon 组件（禁 emoji）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@yuna/ui'

const route = useRoute()
const router = useRouter()

const COLLAPSE_KEY = 'yuna.admin.sider-collapsed'
const THEME_KEY = 'yuna.admin.theme'

const collapsed = ref(false)
const theme = ref<'light' | 'dark'>('light')

const nav = [
  { key: 'dashboard', label: '概览', icon: 'dashboard', path: '/dashboard' },
  { key: 'users', label: '用户管理', icon: 'users', path: '/users' },
  { key: 'roles', label: '角色管理', icon: 'shield', path: '/roles' },
  { key: 'permissions', label: '权限管理', icon: 'key', path: '/permissions' },
  { key: 'menus', label: '菜单管理', icon: 'menu', path: '/menus' },
  { key: 'depts', label: '部门管理', icon: 'building', path: '/depts' },
  { key: 'audit', label: '审计日志', icon: 'file', path: '/audit' },
  { key: 'templates', label: '通知模板', icon: 'bell', path: '/templates' },
]

const activePath = computed(() => route.path)

function applyTheme(): void {
  document.documentElement.dataset.theme = theme.value
}

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, theme.value)
  applyTheme()
}

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
}

onMounted(() => {
  const savedTheme = localStorage.getItem(THEME_KEY)
  if (savedTheme === 'dark' || savedTheme === 'light') theme.value = savedTheme
  collapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1'
  applyTheme()
})
</script>

<template>
  <div class="shell" :class="{ 'is-collapsed': collapsed }">
    <aside class="sider">
      <div class="brand">
        <span class="mark">Y</span>
        <b v-if="!collapsed">YunaNexus</b>
        <button class="icon-btn toggle" type="button" title="折叠侧栏" @click="toggleCollapse">
          <Icon :name="collapsed ? 'chevronRight' : 'chevronLeft'" />
        </button>
      </div>
      <nav class="nav">
        <button
          v-for="item in nav"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ on: activePath.startsWith(item.path) }"
          :title="collapsed ? item.label : undefined"
          @click="router.push(item.path)"
        >
          <Icon :name="item.icon" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <header class="header">
      <div class="title">{{ nav.find((n) => activePath.startsWith(n.path))?.label ?? '' }}</div>
      <div class="grow" />
      <button class="icon-btn" type="button" title="切换日夜" @click="toggleTheme">
        <Icon name="theme" />
      </button>
      <button class="icon-btn" type="button" title="通知"><Icon name="bell" /></button>
      <div class="who">
        <span class="avatar">A</span>
        <span>admin</span>
      </div>
    </header>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--yuna-sider-w, 236px) 1fr;
  grid-template-rows: var(--yuna-header-h, 56px) 1fr;
  grid-template-areas: 'sider header' 'sider content';
  height: 100vh;
  transition: grid-template-columns 0.18s ease;
}

.shell.is-collapsed {
  grid-template-columns: var(--yuna-sider-w-collapsed, 64px) 1fr;
}

.sider {
  grid-area: sider;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--yuna-glass-surface);
  border-right: 1px solid var(--yuna-glass-border);
  -webkit-backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
}

.brand {
  height: var(--yuna-header-h, 56px);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 16px;
  border-bottom: 1px solid var(--yuna-line, #e6e8eb);
  overflow: hidden;
}

.mark {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  background: var(--yuna-primary, #226f9b);
}

.brand b {
  font-size: 14px;
  white-space: nowrap;
}

.toggle {
  margin-left: auto;
}

.nav {
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--yuna-ink-2, #57606a);
  font-size: 13.5px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-item:hover {
  background: color-mix(in srgb, var(--yuna-glass-surface-strong) 70%, transparent);
}

.nav-item.on {
  background: color-mix(in srgb, var(--yuna-primary, #226f9b) 10%, transparent);
  color: var(--yuna-primary, #226f9b);
  font-weight: 600;
}

.is-collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.header {
  grid-area: header;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: var(--yuna-glass-surface);
  border-bottom: 1px solid var(--yuna-glass-border);
  -webkit-backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
}

.title {
  font-size: 13px;
  color: var(--yuna-ink-2, #57606a);
}

.grow {
  flex: 1;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--yuna-ink-2, #57606a);
  cursor: pointer;
}

.icon-btn:hover {
  background: color-mix(in srgb, var(--yuna-glass-surface-strong) 70%, transparent);
  border-color: var(--yuna-glass-border);
}

.who {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 3px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--yuna-ink-2, #57606a);
  cursor: pointer;
}

.who:hover {
  background: color-mix(in srgb, var(--yuna-glass-surface-strong) 70%, transparent);
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  background: color-mix(in srgb, var(--yuna-primary, #226f9b) 12%, #fff);
  color: var(--yuna-primary, #226f9b);
}

.content {
  grid-area: content;
  min-height: 0;
  overflow: auto;
  padding: 20px 24px 24px;
  background:
    radial-gradient(900px 560px at 6% 4%, #dceffa 0%, transparent 58%),
    radial-gradient(760px 520px at 94% 10%, #cfeaf7 0%, transparent 55%),
    radial-gradient(820px 600px at 80% 94%, #d9f7e8 0%, transparent 58%),
    linear-gradient(165deg, #f7f9fc, #eef3f8 60%, #f6f8fb);
  background-attachment: fixed;
}
</style>
