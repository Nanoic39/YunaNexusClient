<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
import { readEnv, session } from '@yuna/core'

const env = readEnv()

/** 清除接驳来的会话，回到用户端统一登录以更换账号 */
function relogin(): void {
  session.clearUser()
  if (env.userAppUrl) {
    window.location.href = `${env.userAppUrl.replace(/\/+$/, '')}/login`
    return
  }
  window.location.reload()
}
</script>

<template>
  <div class="yuna-fallback">
    <n-result
      status="403"
      title="无权访问管理后台"
      description="当前账号未持有管理角色（admin），请使用具备管理权限的账号登录。"
    >
      <template #footer>
        <n-button type="primary" @click="relogin">使用其他账号登录</n-button>
      </template>
    </n-result>
  </div>
</template>
