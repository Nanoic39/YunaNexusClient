<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { ApiError, authApi, toErrorMessage } from '@yuna/core'

/**
 * 账号解锁申诉页。
 *
 * 账号被安全风控锁定后，可通过此页提交申诉（需验证密码以证明账号归属）。
 * 字段约束与后端 `UnlockAppealRequest` 一致：申诉说明 ≤500、联系方式 ≤128。
 */
const router = useRouter()
const message = useMessage()

const form = reactive({ username: '', password: '', appealReason: '', contact: '' })
const submitting = ref(false)

function validate(): string | null {
  if (!form.username.trim()) return '请输入被锁定的账号'
  if (!form.password) return '请输入账号密码以验证归属'
  if (form.appealReason.length > 500) return '申诉说明不能超过 500 字'
  if (form.contact.length > 128) return '联系方式不能超过 128 字'
  return null
}

async function submit(): Promise<void> {
  const invalid = validate()
  if (invalid) {
    message.warning(invalid)
    return
  }

  submitting.value = true
  try {
    await authApi.unlockAppeal({
      username: form.username.trim(),
      password: form.password,
      appealReason: form.appealReason.trim(),
      contact: form.contact.trim() || undefined,
    })
    message.success('申诉已提交，请等待管理员审核')
    await router.replace({ name: 'login' })
  } catch (error) {
    if (error instanceof ApiError && error.code === 30301) message.error('该账号已有待处理的申诉，请勿重复提交')
    else message.error(toErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    heading="账号解锁申诉"
    subheading="账号因安全风控被锁定？提交申诉，由管理员复核后解锁"
    brand-title="YunaNexus"
    brand-tagline="统一中控台，集中管理用户、权限与审计。"
    brand-description="申诉需验证账号密码以确认归属，审核通过后账号将自动解锁。"
  >
    <template #brand>
      <ul class="yuna-points">
        <li>异常登录自动锁定，保护账号安全</li>
        <li>提交申诉后由管理员人工复核</li>
        <li>审核通过即自动解锁，无需重复操作</li>
      </ul>
    </template>

    <n-form :show-label="false" @submit.prevent="submit">
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.username"
          size="large"
          placeholder="被锁定的账号"
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
          placeholder="账号密码（用于验证归属）"
          :maxlength="64"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.appealReason"
          type="textarea"
          size="large"
          placeholder="申诉说明（选填，如锁定原因、情况说明）"
          :maxlength="500"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.contact"
          size="large"
          placeholder="联系方式（选填，便于管理员联系核实）"
          :maxlength="128"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-button type="primary" block size="large" :loading="submitting" @click="submit">
        提交申诉
      </n-button>
    </n-form>

    <template #footer>
      <p>已恢复访问？<router-link :to="{ name: 'login' }">返回登录</router-link></p>
    </template>
  </AuthLayout>
</template>
