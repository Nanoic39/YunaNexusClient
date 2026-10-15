<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GlobeOutline, LogOutOutline, PersonCircleOutline } from '@vicons/ionicons5'
import {
  AccountMenu,
  AppShell,
  NotificationButton,
  ThemeToggle,
  truncateMiddle,
  useSiderCollapsed,
} from '@yuna/ui'
import { authApi, buildHandoffUrl, readEnv, session } from '@yuna/core'
import { userMenuOptions } from '@/config/menu'

const route = useRoute()
const router = useRouter()

const env = readEnv()

/** 折叠态持久化：刷新后保持，且首帧即为最终状态 */
const { collapsed } = useSiderCollapsed()
const activeKey = computed(() => route.path)
const accountName = computed(() => {
  if (session.state.nickname) return session.state.nickname
  return session.state.externalId ? truncateMiddle(session.state.externalId) : '我的账号'
})

/** 仅持有根角色 `admin` 的用户可见「进入管理后台」，且需配置了管理端地址 */
const canEnterAdmin = computed(() => session.canEnterAdmin.value && Boolean(env.adminAppUrl))

/** 账号菜单条目（与 AccountMenu 的 items 契约一致） */
type AccountEntry =
  | { key: string; label: string; icon?: Component; danger?: boolean }
  | { type: 'divider'; key: string }

const accountItems = computed<AccountEntry[]>(() => {
  const items: AccountEntry[] = [{ key: '/console/profile', label: '个人中心', icon: PersonCircleOutline }]
  if (canEnterAdmin.value) {
    items.push({ key: 'enter-admin', label: '进入管理后台', icon: GlobeOutline })
  }
  items.push({ type: 'divider', key: 'account-divider' })
  items.push({ key: 'logout', label: '退出登录', icon: LogOutOutline, danger: true })
  return items
})

function onMenuSelect(key: string): void {
  if (key !== route.path) void router.push(key)
}

/** 点击 Logo 返回门户首页 */
function goPortal(): void {
  void router.push({ name: 'home' })
}

/** 顶栏通知面板：带 id 直达单条详情页，否则进入站内信列表页 */
function onNoticeOpen(noticeId?: number): void {
  if (noticeId) {
    void router.push({ name: 'message-detail', params: { noticeId: String(noticeId) } })
    return
  }
  void router.push({ name: 'messages' })
}

async function onAccountSelect(key: string): Promise<void> {
  if (key === 'enter-admin') {
    // 跨应用跳转：目标为独立部署的管理端（不同域/端口），由管理端发起授权码登录
    window.location.href = buildHandoffUrl(env.adminAppUrl)
    return
  }
  if (key === 'logout') {
    try {
      await authApi.logout()
    } catch {
      /* 服务端登出失败不阻塞本地会话清理 */
    }
    session.clearUser()
    void router.replace({ name: 'home' })
    return
  }
  if (key !== route.path) void router.push(key)
}
</script>

<template>
  <AppShell
    v-model:collapsed="collapsed"
    :value="activeKey"
    :menu-options="userMenuOptions"
    brand-title="YunaNexus"
    brand-subtitle="用户控制台"
    brand-interactive
    @brand-click="goPortal"
    @update:value="onMenuSelect"
  >
    <template #header-actions>
      <NotificationButton @open="onNoticeOpen" />
      <ThemeToggle />
      <AccountMenu :name="accountName" :items="accountItems" @select="onAccountSelect" />
    </template>

    <router-view v-slot="{ Component, route: current }">
      <Transition name="yuna-page" mode="out-in">
        <component :is="Component" :key="current.path" />
      </Transition>
    </router-view>
  </AppShell>
</template>
