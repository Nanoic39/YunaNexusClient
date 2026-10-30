<script setup lang="ts">
import { session } from '@yuna/core'
import { useLogout } from '../../../auth/composables/useLogout'
const { logout, busy, error } = useLogout()
</script>
<template>
  <section class="workspace-panel">
    <h1>个人中心</h1>
    <p>{{ session.state.nickname || session.state.externalId }}</p>
    <p class="account-description">管理你的平台访问与个人偏好。</p>
    <div class="workspace-actions">
      <RouterLink to="/usr/settings" class="workspace-button">主题与外观</RouterLink>
      <RouterLink v-if="session.canAccessAdmin.value" to="/console" class="workspace-button primary"
        >进入管理台</RouterLink
      ><button class="workspace-button" :disabled="busy" @click="logout">退出登录</button>
    </div>
    <p class="workspace-error" role="alert">{{ error }}</p>
  </section>
</template>

<style scoped>
.workspace-panel {
  max-width: var(--ws-article-width);
  margin-inline: auto;
}
h1 {
  margin-bottom: var(--ws-gap-3);
}
.account-description {
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
  margin-block: var(--ws-gap-2) var(--ws-gap-6);
}
.workspace-error {
  margin-top: var(--ws-gap-4);
}
</style>
