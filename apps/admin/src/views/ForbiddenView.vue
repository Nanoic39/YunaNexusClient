<script setup lang="ts">
/**
 * 已登录但没有后台访问权限。
 *
 * 与登录页不同：这里用户是有效身份，只是角色不含 admin，
 * 所以不提供登录入口，只说明原因与退出方式。
 */
import { useRouter } from 'vue-router'
import { authApi, session } from '@yuna/core'
import { PageHeader, Surface } from '@yuna/ui'

const router = useRouter()

async function logout(): Promise<void> {
  try {
    await authApi.logout()
  } finally {
    session.clearAll()
    router.replace('/forbidden')
    window.location.reload()
  }
}
</script>

<template>
  <div class="wrap">
    <Surface class="card">
      <PageHeader title="无后台访问权限" description="当前账号不是管理员，无法进入管理台" />
      <p class="hint">如需访问，请联系管理员为你分配管理员角色。退出登录会同时退出整个平台。</p>
      <button class="btn" type="button" @click="logout">退出登录</button>
    </Surface>
  </div>
</template>

<style scoped>
.wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(165deg, #f7f9fc, #eef1f7 55%, #f6f7fb);
}
.card {
  width: 440px;
  padding: 24px;
}
.hint {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--yuna-ink-2, #57606a);
}
.btn {
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
}
</style>
