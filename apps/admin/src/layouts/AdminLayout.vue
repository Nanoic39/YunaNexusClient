<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GlobeOutline, LogOutOutline } from '@vicons/ionicons5'
import { AccountMenu, AppShell, ThemeToggle, useSiderCollapsed } from '@yuna/ui'
import { readEnv, session } from '@yuna/core'
import { adminMenuOptions } from '@/config/menu'

const route = useRoute()
const router = useRouter()

const env = readEnv()

/** 折叠态持久化：刷新后保持，且首帧即为最终状态 */
const { collapsed } = useSiderCollapsed()
const activeKey = computed(() => route.path)

/** 进入用户端的入口：仅在配置了用户端地址时提供 */
const accountItems = env.userAppUrl
  ? [
      { key: 'enter-user', label: '进入用户端', icon: GlobeOutline },
      { type: 'divider' as const, key: 'account-divider' },
      { key: 'logout', label: '退出登录', icon: LogOutOutline, danger: true },
    ]
  : [{ key: 'logout', label: '退出登录', icon: LogOutOutline, danger: true }]

function onMenuSelect(key: string): void {
  if (key !== route.path) void router.push(key)
}

function onAccountSelect(key: string): void {
  if (key === 'logout') {
    session.clearAll()
    void router.replace({ name: 'login' })
    return
  }
  if (key === 'enter-user') {
    // 跨应用跳转：目标为独立部署的用户端，直接整页导航
    window.location.href = env.userAppUrl
  }
}
</script>

<template>
  <AppShell
    v-model:collapsed="collapsed"
    :value="activeKey"
    :menu-options="adminMenuOptions"
    brand-title="YunaNexus"
    brand-subtitle="管理台"
    @update:value="onMenuSelect"
  >
    <template #header-actions>
      <ThemeToggle />
      <AccountMenu name="管理员" subtitle="超级管理员" :items="accountItems" @select="onAccountSelect" />
    </template>

    <router-view v-slot="{ Component, route: current }">
      <Transition name="yuna-page" mode="out-in">
        <component :is="Component" :key="current.path" />
      </Transition>
    </router-view>
  </AppShell>
</template>
