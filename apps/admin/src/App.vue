<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NDialogProvider, NMessageProvider, darkTheme, dateZhCN, zhCN } from 'naive-ui'
import { darkThemeOverrides, themeMode, themeOverrides } from '@yuna/theme'
import { ContextMenu } from '@yuna/ui'

const isDark = computed(() => themeMode.resolved.value === 'dark')
const theme = computed(() => (isDark.value ? darkTheme : null))
const overrides = computed(() => (isDark.value ? darkThemeOverrides : themeOverrides))
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="overrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
        <context-menu />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
