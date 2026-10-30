<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@yuna/ui'
import { session } from '@yuna/core'
import DayNightToggle from '../app/components/DayNightToggle.vue'
import WorkspaceBrand from '../app/components/WorkspaceBrand.vue'
import { adminNavigation } from '../config/navigation'
import { useLogout } from '../features/auth/composables/useLogout'
const preview = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true'
const collapsed = ref(false)
const displayName = computed(() => session.state.nickname || '当前账户')
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const { logout, busy, error } = useLogout()
</script>
<template>
  <div class="admin-shell" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <WorkspaceBrand :compact="collapsed" /><button
          class="workspace-button quiet workspace-icon-button collapse-control"
          :aria-expanded="!collapsed"
          :title="collapsed ? '展开侧栏' : '收起侧栏'"
          aria-label="切换侧栏"
          @click="collapsed = !collapsed"
        >
          <Icon :name="collapsed ? 'chevronRight' : 'chevronLeft'" />
        </button>
      </div>
      <nav class="sidebar-navigation" aria-label="管理导航">
        <p v-if="!collapsed" class="nav-label">账户管理</p>
        <RouterLink
          v-for="item in adminNavigation"
          :key="item.path"
          :to="item.path"
          :title="item.label"
          class="nav-link"
          ><Icon :name="item.icon" :size="18" /><span v-if="!collapsed">{{
            item.label
          }}</span></RouterLink
        >
      </nav>
      <div class="sidebar-footer">
        <span class="workspace-indicator" /><span v-if="!collapsed">管理台</span>
      </div>
    </aside>
    <header class="topbar">
      <div class="context-group">
        <span class="workspace-context">管理工作区</span
        ><span v-if="preview" class="preview-label">演示数据</span>
      </div>
      <div class="topbar-actions">
        <RouterLink to="/usr" class="workspace-button quiet"
          >个人中心<Icon name="arrowRight" :size="14" /></RouterLink
        ><span class="header-divider" /><DayNightToggle />
        <div class="account-control">
          <span class="account-avatar" aria-hidden="true">{{ initial }}</span
          ><span class="account-name">{{ displayName }}</span
          ><button
            class="workspace-button quiet workspace-icon-button"
            :disabled="busy"
            title="退出登录"
            aria-label="退出登录"
            @click="logout"
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </header>
    <main class="content">
      <div v-if="error" class="workspace-error shell-error" role="alert">{{ error }}</div>
      <div class="content-inner"><RouterView /></div>
    </main>
  </div>
</template>
<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: var(--ws-sidebar-width) minmax(0, 1fr);
  grid-template-rows: var(--ws-header-height) minmax(0, 1fr);
  height: 100dvh;
  background: var(--ws-canvas);
}
.admin-shell.collapsed {
  grid-template-columns: var(--yuna-sider-collapsed-width) minmax(0, 1fr);
}
.sidebar {
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--ws-surface);
  border-right: 1px solid var(--ws-line);
}
.sidebar-brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ws-gap-2);
  min-height: var(--ws-header-height);
  padding-inline: var(--ws-gap-4) var(--ws-gap-2);
}
.collapsed .sidebar-brand {
  flex-direction: column;
  padding: var(--ws-gap-3) 0;
}
.collapse-control {
  color: var(--ws-faint);
}
.sidebar-navigation {
  flex: 1;
  padding: var(--ws-gap-5) var(--ws-gap-3);
  overflow: auto;
}
.nav-label {
  font-size: var(--ws-font-caption);
  color: var(--ws-faint);
  margin-bottom: var(--ws-gap-2);
  padding-inline: var(--ws-gap-3);
}
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-3);
  min-height: var(--ws-auth-control);
  padding-inline: var(--ws-gap-3);
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
  border-radius: var(--ws-radius);
}
.nav-link:hover {
  background: var(--ws-soft);
  color: var(--ws-ink);
}
.nav-link.router-link-active {
  background: var(--ws-selected);
  color: var(--yuna-primary);
  font-weight: 500;
}
.collapsed .nav-link {
  padding-inline: 0;
  justify-content: center;
}
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
  padding: var(--ws-gap-5) var(--ws-gap-6);
  color: var(--ws-faint);
  font-size: var(--ws-font-caption);
}
.workspace-indicator {
  width: var(--ws-gap-2);
  height: var(--ws-gap-2);
  border: 1px solid var(--ws-faint);
  border-radius: 50%;
  flex: none;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ws-gap-3);
  padding-inline: var(--ws-gap-6);
  background: var(--ws-panel);
  border-bottom: 1px solid var(--ws-line);
}
.context-group {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-3);
}
.preview-label {
  font-size: var(--ws-font-caption);
  color: var(--ws-muted);
  border: 1px solid var(--ws-line);
  border-radius: var(--yuna-radius-sm);
  padding-inline: var(--ws-gap-2);
}
.workspace-context {
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
}
.topbar-actions,
.account-control {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
}
.header-divider {
  width: 1px;
  height: var(--ws-gap-4);
  background: var(--ws-line);
  margin-inline: var(--ws-gap-1);
}
.account-control {
  margin-left: var(--ws-gap-2);
}
.account-avatar {
  display: grid;
  place-items: center;
  width: var(--ws-brand-size);
  height: var(--ws-brand-size);
  background: var(--ws-selected);
  color: var(--yuna-primary);
  border: 1px solid var(--ws-line);
  border-radius: 50%;
  font-size: var(--ws-font-caption);
  font-weight: 600;
}
.account-name {
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
  max-width: 10em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: var(--ws-gap-6);
}
.content-inner {
  width: 100%;
  max-width: var(--yuna-page-max-width);
  margin-inline: auto;
}
.shell-error {
  margin-bottom: var(--ws-gap-4);
}
@media (max-width: 760px) {
  .admin-shell,
  .admin-shell.collapsed {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto var(--ws-header-height) minmax(0, 1fr);
  }
  .sidebar {
    grid-row: auto;
    flex-direction: row;
    align-items: center;
    border-right: 0;
    border-bottom: 1px solid var(--ws-line);
  }
  .sidebar-brand {
    padding: var(--ws-gap-3) var(--ws-gap-4);
  }
  .sidebar-navigation {
    padding: var(--ws-gap-2);
    flex: 1;
  }
  .nav-label,
  .sidebar-footer,
  .collapse-control {
    display: none;
  }
  .topbar {
    padding-inline: var(--ws-gap-4);
  }
  .workspace-context,
  .account-name {
    display: none;
  }
  .topbar-actions {
    justify-content: flex-end;
    width: 100%;
  }
  .content {
    padding: var(--ws-gap-4);
  }
}
</style>
