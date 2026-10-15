<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { buildSsoLoginUrl, readEnv, safeLocalRedirect, session } from '@yuna/core'

const route = useRoute()
const router = useRouter()

const loggedOut = computed(() => route.query.loggedout === '1')
const ssoError = computed(() => route.query.error === 'sso')

/** 登录后跳转目标 */
function targetAfterLogin(): string {
  return safeLocalRedirect(route.query.redirect, '/overview')
}

/**
 * 统一登录地址：用户端登录页，登录成功后携带一次性授权码跳回管理端。
 * 管理台与用户端共用同一账号体系（SSO），不提供独立登录表单。
 */
const ssoUrl = computed(() => readEnv().userAppUrl)

const redirecting = ref(false)

function goSso(): void {
  if (!ssoUrl.value) return
  redirecting.value = true
  window.location.href = buildSsoLoginUrl(targetAfterLogin())
}

onMounted(() => {
  // 已从用户端接驳会话且持有管理角色：无需二次登录，直接放行
  if (session.canAccessAdmin.value) {
    void router.replace(targetAfterLogin())
    return
  }
  // 统一登录：直接跳用户端登录页
  if (!ssoError.value && !loggedOut.value) goSso()
})
</script>

<template>
  <AuthLayout
    :heading="loggedOut ? '已退出管理台' : '正在前往统一登录'"
    subheading="管理台与用户端共用同一账号，登录后即可进入中控台"
    brand-title="YunaNexus"
    brand-tagline="统一中控台，集中管理用户、权限与审计。"
    brand-description="面向平台运营与运维的管理入口。使用同一账号登录后，可管理用户账号、权限与数据范围，维护门户内容，并查看平台运行概览。"
  >
    <template #brand>
      <ul class="yuna-points">
        <li>一处登录，两端通行（SSO）</li>
        <li>角色权限与数据范围管理</li>
        <li>全链路审计与通知记录</li>
      </ul>
    </template>

    <n-button type="primary" block size="large" :loading="redirecting" :disabled="!ssoUrl" @click="goSso">
      前往统一登录
    </n-button>

    <template #footer>
      <p v-if="ssoError">登录请求已失效或校验失败，请点击上方按钮重新登录。</p>
      <p v-else-if="loggedOut">已退出当前管理台会话，点击上方按钮可重新登录。</p>
      <p v-else-if="ssoUrl">未自动跳转？点击上方按钮前往统一登录页。</p>
      <p v-else>未配置用户端地址（VITE_USER_URL），无法跳转统一登录页，请联系平台管理员。</p>
      <p>进入管理台需要账号持有 <strong>admin</strong> 角色。</p>
    </template>
  </AuthLayout>
</template>
