<script setup lang="ts">
import { computed, watch } from 'vue'
import { session } from '@yuna/core'
import { useRoute, useRouter } from 'vue-router'
import { navigationError, failedPath } from './app/navigation-error'
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  darkTheme,
  dateZhCN,
  zhCN,
} from 'naive-ui'
import {
  darkThemeOverrides,
  displayMode,
  themeOverrides,
  appearance,
  createAppearanceOverrides,
} from '@yuna/theme'
import { ContextMenu } from '@yuna/ui'

const router = useRouter()
const route = useRoute()
watch(session.isAuthenticated, (authenticated) => {
  if (!authenticated && !route.meta.public)
    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
})
watch(
  () => session.state.externalId,
  (identity) => appearance.setScope(identity),
  { immediate: true },
)
const isDark = computed(() => displayMode.resolved.value === 'dark')
const theme = computed(() => (isDark.value ? darkTheme : null))
const overrides = computed(() =>
  createAppearanceOverrides(isDark.value ? darkThemeOverrides : themeOverrides),
)
</script>

<template>
  <n-config-provider
    class="workspace-root"
    :theme="theme"
    :theme-overrides="overrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <main v-if="navigationError" class="workspace-panel" role="alert">
          <h1>暂时无法打开页面</h1>
          <p>{{ navigationError }}</p>
          <button class="workspace-button primary" @click="router.replace(failedPath)">重试</button>
          <RouterLink class="workspace-button" to="/login">返回登录</RouterLink>
        </main>
        <router-view v-else />
        <context-menu />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
