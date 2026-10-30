<script setup lang="ts">
import { ref, reactive, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { authApi, session, toErrorMessage } from '@yuna/core'
const router = useRouter(),
  message = useMessage()
const form = reactive({ username: '', email: '', code: '', password: '', confirm: '' })
const step = ref(0),
  busy = ref(false),
  ticket = ref(''),
  remaining = ref(0)
onMounted(async () => {
  if (!session.isAuthenticated.value) return
  try {
    const current = await authApi.accountSecurity()
    if (!form.username) form.username = current.username
    if (!form.email) form.email = current.email || ''
  } catch {}
})
const timer = setInterval(() => (remaining.value = Math.max(0, remaining.value - 1)), 1000)
onBeforeUnmount(() => {
  clearInterval(timer)
  ticket.value = ''
  form.password = ''
  form.confirm = ''
  form.code = ''
})
async function send() {
  if (busy.value || remaining.value) return
  if (!form.username.trim() || !form.email.includes('@')) {
    message.warning('请输入账号和绑定邮箱')
    return
  }
  busy.value = true
  try {
    await authApi.requestPasswordReset(form.username.trim(), form.email.trim())
    message.info('若账号与邮箱匹配，验证码将发送至绑定邮箱')
    remaining.value = 60
    step.value = 1
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    busy.value = false
  }
}
async function verify() {
  if (busy.value) return
  busy.value = true
  try {
    const r = await authApi.verifyPasswordReset(form.username.trim(), form.email.trim(), form.code)
    ticket.value = r.ticket
    form.code = ''
    step.value = 2
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    busy.value = false
  }
}
async function complete() {
  if (busy.value) return
  if (
    form.password.length < 8 ||
    form.password.length > 64 ||
    form.password === '12345678' ||
    form.password !== form.confirm
  ) {
    message.warning('请填写8~64位新密码并确认一致，不能使用默认临时密码')
    return
  }
  busy.value = true
  try {
    await authApi.completePasswordReset(ticket.value, form.password)
    ticket.value = ''
    session.clearUser()
    message.success('密码已更新，旧会话已退出，请重新登录')
    await router.replace('/login')
  } catch (e) {
    message.error(toErrorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <auth-layout heading="找回密码" subheading="验证绑定邮箱后重置密码，并设置新的登录密码">
    <n-alert v-if="step === 2" type="info" style="margin-bottom: 20px"
      >邮箱验证成功，密码已重置为临时值。请在5分钟内设置新密码；临时密码不能直接进入账号。</n-alert
    >
    <template v-if="step < 2"
      ><n-form-item label="账号" label-for="reset-username"
        ><n-input
          v-model:value="form.username"
          aria-label="找回密码的账号"
          :input-props="{ id: 'reset-username', name: 'username' }"
          placeholder="注册时设置的账号"
          :disabled="busy"
          autocomplete="username"
          maxlength="64" /></n-form-item
      ><n-form-item label="绑定邮箱" label-for="reset-email"
        ><n-input
          v-model:value="form.email"
          aria-label="账号绑定邮箱"
          :input-props="{ id: 'reset-email', name: 'email', inputmode: 'email' }"
          placeholder="注册或之后绑定的邮箱"
          :disabled="busy"
          autocomplete="email"
          maxlength="128" /></n-form-item
      ><n-button :loading="busy" :disabled="remaining > 0" @click="send">{{
        remaining ? `${remaining}秒后重发` : '发送验证码'
      }}</n-button
      ><template v-if="step === 1"
        ><n-form-item label="邮箱验证码" label-for="reset-code" style="margin-top: 20px"
          ><n-input
            v-model:value="form.code"
            aria-label="邮箱验证码"
            :input-props="{ id: 'reset-code', name: 'code', inputmode: 'numeric' }"
            maxlength="6"
            autocomplete="one-time-code"
            @keyup.enter="verify" /></n-form-item
        ><n-button block type="primary" :loading="busy" @click="verify"
          >验证并重置</n-button
        ></template
      ></template
    >
    <template v-else
      ><n-form-item label="新密码" label-for="reset-password"
        ><n-input
          v-model:value="form.password"
          aria-label="设置新登录密码"
          :input-props="{ id: 'reset-password', name: 'newPassword' }"
          type="password"
          autocomplete="new-password"
          show-password-on="click"
          maxlength="64" /></n-form-item
      ><n-form-item label="确认新密码" label-for="reset-confirm"
        ><n-input
          v-model:value="form.confirm"
          aria-label="再次确认新密码"
          :input-props="{ id: 'reset-confirm', name: 'confirmPassword' }"
          type="password"
          autocomplete="new-password"
          maxlength="64"
          @keyup.enter="complete" /></n-form-item
      ><n-button block type="primary" :loading="busy" @click="complete"
        >保存新密码</n-button
      ></template
    >
    <template #footer><router-link to="/login">返回登录</router-link></template></auth-layout
  >
</template>
