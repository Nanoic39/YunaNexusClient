<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { authAdminApi, readEnv, session } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const env = readEnv()
const mockEnabled = computed(() => env.enableMock)

const token = ref(env.adminToken)
const submitting = ref(false)

async function submit(): Promise<void> {
  const value = token.value.trim()
  if (!value) {
    message.warning('请输入管理员密钥')
    return
  }

  submitting.value = true
  const previous = session.state.adminToken
  // 先落盘再校验，使请求自动携带 X-Admin-Token；校验失败则回滚
  session.setAdminToken(value)
  try {
    await authAdminApi.listUsers({ page: 1, size: 1 })
    message.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/overview'
    await router.replace(redirect)
  } catch (error) {
    session.setAdminToken(previous)
    message.error(handleApiError(error, router))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    heading="管理台登录"
    subheading="请输入管理员密钥以进入中控台"
    brand-title="YunaNexus"
    brand-tagline="统一中控台，集中管理用户、权限与审计。"
    brand-description="面向平台运营与运维的管理入口。登录后可管理用户账号、维护门户内容，并查看平台运行概览。"
  >
    <template #brand>
      <ul class="yuna-points">
        <li>统一身份认证与账号风控</li>
        <li>角色权限与数据范围管理</li>
        <li>全链路审计与通知记录</li>
      </ul>
    </template>

    <n-form :show-label="false" @submit.prevent="submit">
      <n-form-item :show-label="false">
        <n-input
          v-model:value="token"
          type="password"
          show-password-on="click"
          size="large"
          placeholder="管理员密钥（X-Admin-Token）"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-button type="primary" block size="large" :loading="submitting" @click="submit">
        登录
      </n-button>
    </n-form>

    <template #footer>
      <p v-if="mockEnabled">
        当前为 <strong>Mock 模式</strong>，任意非空密钥均可登录。
      </p>
      <p v-else>
        请向平台管理员获取密钥。密钥仅保存在当前浏览器会话中。
      </p>
    </template>
  </AuthLayout>
</template>
