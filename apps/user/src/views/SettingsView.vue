<script setup lang="ts">
import { onMounted, reactive, ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NFormItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSpin,
  useDialog,
  useMessage,
} from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import { themeMode } from '@yuna/theme'
import type { ThemeMode } from '@yuna/theme'
import { authApi, session, toErrorMessage } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const router = useRouter(),
  message = useMessage(),
  dialog = useDialog()
const account = ref<Awaited<ReturnType<typeof authApi.accountSecurity>> | null>(null),
  error = ref(''),
  loading = ref(false),
  busy = ref(false)
const form = reactive({ oldPassword: '', password: '', confirm: '' })
let alive = true
async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await authApi.accountSecurity()
    if (alive) account.value = r
  } catch (e) {
    if (alive) error.value = handleApiError(e, router)
  } finally {
    if (alive) loading.value = false
  }
}
const emailForm = reactive({ email: '', oldPassword: '', code: '' })
const emailOpen = ref(false),
  emailBusy = ref(false),
  emailWait = ref(0),
  emailSent = ref(false)
const emailTimer = setInterval(() => (emailWait.value = Math.max(0, emailWait.value - 1)), 1000)
async function sendEmail() {
  if (emailBusy.value || emailWait.value) return
  if (!emailForm.email.includes('@') || !emailForm.oldPassword) {
    message.warning('请填写当前密码和新的找回邮箱')
    return
  }
  emailBusy.value = true
  try {
    await authApi.requestRecoveryEmail(emailForm.email.trim(), emailForm.oldPassword)
    emailForm.oldPassword = ''
    emailWait.value = 60
    emailSent.value = true
    message.success('验证码已发送至新邮箱')
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    emailBusy.value = false
  }
}
async function bindEmail() {
  if (emailBusy.value) return
  const current = session.state.externalId
  emailBusy.value = true
  try {
    await authApi.verifyRecoveryEmail(emailForm.email.trim(), emailForm.code)
    emailForm.email = ''
    emailForm.oldPassword = ''
    emailForm.code = ''
    emailOpen.value = false
    emailSent.value = false
    if (current === session.state.externalId) {
      await load()
      message.success('找回邮箱已更新')
    }
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    emailBusy.value = false
  }
}
async function change() {
  if (busy.value) return
  if (
    !form.oldPassword ||
    form.password.length < 8 ||
    form.password.length > 64 ||
    form.password === '12345678' ||
    form.password !== form.confirm
  ) {
    message.warning('请填写当前密码，并确认8~64位新密码一致；不能使用临时密码')
    return
  }
  const current = session.state.externalId
  busy.value = true
  try {
    await authApi.changePassword(form.oldPassword, form.password)
    form.oldPassword = ''
    form.password = ''
    form.confirm = ''
    if (current !== session.state.externalId) return
    session.clearUser()
    message.success('密码已更新，所有会话及个人密钥已撤销，请重新登录')
    await router.replace('/login')
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    busy.value = false
  }
}
function logoutAll() {
  dialog.warning({
    title: '退出所有设备',
    content: '所有设备上的登录会话将立即失效。',
    positiveText: '退出所有设备',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await authApi.logoutAll()
        session.clearUser()
        await router.replace('/login')
      } catch (e) {
        message.error(toErrorMessage(e))
      }
    },
  })
}
onMounted(load)
onBeforeUnmount(() => {
  alive = false
  clearInterval(emailTimer)
  emailForm.oldPassword = ''
  emailForm.code = ''
  emailForm.email = ''
  form.oldPassword = ''
  form.password = ''
  form.confirm = ''
})
</script>
<template>
  <page-container title="账号设置" description="集中管理账号安全、外观和个人授权"
    ><div class="settings-grid">
      <section-card title="账号与安全"
        ><n-spin :show="loading"
          ><n-alert v-if="error" type="error"
            >{{ error }} <n-button text @click="load">重试</n-button></n-alert
          ><template v-else-if="account"
            ><p>账号：{{ account.username }}</p>
            <p>找回密码邮箱：{{ account.email || '未绑定' }}</p>
            <p>密码更新时间：{{ formatDateTime(account.passwordUpdatedAt) }}</p>
            <p class="muted">此邮箱用于身份验证，与个人资料的联系邮箱分开管理。</p></template
          ></n-spin
        ><n-button @click="emailOpen = !emailOpen" :disabled="emailBusy">{{
          account?.email ? '更换找回邮箱' : '绑定找回邮箱'
        }}</n-button>
        <n-form-item v-if="emailOpen" label="当前密码" style="margin-top: 16px"
          ><n-input
            v-model:value="emailForm.oldPassword"
            aria-label="绑定邮箱时的当前密码"
            type="password"
            maxlength="64"
            autocomplete="current-password"
            :disabled="emailBusy"
        /></n-form-item>
        <n-form-item v-if="emailOpen" label="新的找回邮箱"
          ><n-input
            v-model:value="emailForm.email"
            aria-label="新的找回邮箱"
            maxlength="254"
            autocomplete="email"
            :disabled="emailBusy"
        /></n-form-item>
        <template v-if="emailOpen"
          ><n-button :loading="emailBusy" :disabled="emailWait > 0" @click="sendEmail">{{
            emailWait ? `${emailWait}秒后重发` : '发送绑定验证码'
          }}</n-button
          ><template v-if="emailSent"
            ><n-form-item label="新邮箱验证码" style="margin-top: 16px"
              ><n-input
                v-model:value="emailForm.code"
                aria-label="新邮箱验证码"
                maxlength="6"
                autocomplete="one-time-code"
                :disabled="emailBusy" /></n-form-item
            ><n-button type="primary" :loading="emailBusy" @click="bindEmail"
              >验证并绑定邮箱</n-button
            ></template
          ></template
        >
        <n-button @click="router.push('/password-reset')">通过邮箱找回密码</n-button></section-card
      >
      <section-card title="修改登录密码" description="修改后退出全部设备并撤销个人 API Key"
        ><n-form-item label="当前密码"
          ><n-input
            v-model:value="form.oldPassword"
            aria-label="当前登录密码"
            type="password"
            autocomplete="current-password"
            maxlength="64" /></n-form-item
        ><n-form-item label="新密码"
          ><n-input
            v-model:value="form.password"
            aria-label="新登录密码"
            type="password"
            autocomplete="new-password"
            maxlength="64"
            show-password-on="click" /></n-form-item
        ><n-form-item label="确认新密码"
          ><n-input
            v-model:value="form.confirm"
            aria-label="确认新登录密码"
            type="password"
            autocomplete="new-password"
            maxlength="64"
            @keyup.enter="change" /></n-form-item
        ><n-button type="primary" :loading="busy" @click="change"
          >更新密码并重新登录</n-button
        ></section-card
      >
      <section-card title="显示外观" description="立即生效，并保存在当前浏览器"
        ><n-radio-group
          :value="themeMode.mode.value"
          @update:value="(v: ThemeMode) => themeMode.setMode(v)"
          ><n-radio-button value="auto">跟随系统</n-radio-button
          ><n-radio-button value="light">浅色</n-radio-button
          ><n-radio-button value="dark">深色</n-radio-button></n-radio-group
        ></section-card
      >
      <section-card title="授权与设备"
        ><div class="settings-actions">
          <n-button @click="router.push('/console/profile')">资料、头像与会话</n-button
          ><n-button @click="router.push('/console/applications')">查看和撤销平台授权</n-button
          ><n-button @click="router.push('/console/api-keys')">管理个人 API Key</n-button
          ><n-button type="error" secondary @click="logoutAll">退出所有设备</n-button>
        </div></section-card
      >
    </div></page-container
  >
</template>
<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}
.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.muted {
  color: var(--yuna-gray-500);
  font-size: 13px;
}
@media (max-width: 850px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
