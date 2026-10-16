<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { ApiError, authApi, safeLocalRedirect, toErrorMessage } from '@yuna/core'

/**
 * 注册页。
 *
 * 与后端 `RegisterRequest` 校验保持一致（账号 4~64 且仅字母/数字/下划线/点/中划线，密码 8~64）；
 * 注册邮箱为必填，用于找回账号；密码重置和邮箱变更时校验归属。
 * 手机号功能未开放，故不提供手机号字段（携带即被后端拒绝，见 api-contract §3.4）。
 */
const router = useRouter()
const route = useRoute()
const message = useMessage()

const form = reactive({ username: '', password: '', confirm: '', email: '' })
const submitting = ref(false)

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): string | null {
  const username = form.username.trim()
  if (username.length < 4 || username.length > 64) return '账号长度需在 4~64 之间'
  if (!USERNAME_RE.test(username)) return '账号仅支持字母、数字、下划线、点、中划线'
  if (form.password.length < 8 || form.password.length > 64) return '密码长度需在 8~64 之间'
  if (form.password !== form.confirm) return '两次输入的密码不一致'
  if (!EMAIL_RE.test(form.email.trim())) return '请输入有效的邮箱地址'
  return null
}

async function submit(): Promise<void> {
  const invalid = validate()
  if (invalid) {
    message.warning(invalid)
    return
  }

  const email = form.email.trim()
  submitting.value = true
  try {
    await authApi.register({
      username: form.username.trim(),
      password: form.password,
      email,
    })
    message.success('注册成功，请登录；账号默认获得门户权限和普通用户角色')
    await router.replace({
      name: 'login',
      query: { redirect: safeLocalRedirect(route.query.redirect, '/console/dashboard') },
    })
  } catch (error) {
    if (error instanceof ApiError && error.code === 30401) message.error('该账号已被注册')
    else message.error(toErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    heading="注册账号"
    subheading="创建你的 YunaNexus 统一账号，一处登录全线通行"
    brand-title="YunaNexus"
    brand-tagline="统一中控台，集中管理用户、权限与审计。"
    brand-description="注册后即可登录用户控制台；如需管理权限，请由平台管理员分配相应角色。"
  >
    <template #brand>
      <ul class="yuna-points">
        <li>统一身份认证，一处登录全线通行</li>
        <li>账号安全风控：异常登录自动锁定</li>
        <li>个人中心集中查看账号与会话</li>
      </ul>
    </template>

    <n-form :show-label="false" @submit.prevent="submit">
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.username"
          size="large"
          placeholder="账号（4~64 位字母/数字/_.-）"
          :maxlength="64"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.password"
          type="password"
          show-password-on="click"
          size="large"
          placeholder="密码（8~64 位）"
          :maxlength="64"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.confirm"
          type="password"
          show-password-on="click"
          size="large"
          placeholder="确认密码"
          :maxlength="64"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.email"
          size="large"
          placeholder="邮箱（必填，用于找回账号）"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-button type="primary" block size="large" :loading="submitting" @click="submit">
        注册
      </n-button>
    </n-form>

    <template #footer>
      <p>已有账号？<router-link :to="{ name: 'login' }">返回登录</router-link></p>
    </template>
  </AuthLayout>
</template>
