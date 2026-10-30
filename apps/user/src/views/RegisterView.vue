<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { ApiError, authApi, safeLocalRedirect, toErrorMessage } from '@yuna/core'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const form = reactive({ username: '', password: '', confirm: '', email: '', emailCode: '' })
type Field = keyof typeof form
const fields: Field[] = ['username', 'email', 'emailCode', 'password', 'confirm']
const fieldIds: Record<Field, string> = {
  username: 'register-username',
  email: 'register-email',
  emailCode: 'register-email-code',
  password: 'register-password',
  confirm: 'register-confirm',
}
const errors = reactive<Record<Field, string>>({
  username: '',
  password: '',
  confirm: '',
  email: '',
  emailCode: '',
})
const submitting = ref(false)
const sending = ref(false)
const requestError = ref('')
const codeNotice = ref('')
const now = ref(Date.now())
const cooldownUntil = ref(0)
const COOLDOWN_KEY = 'yuna-register-email-code-until'
const remaining = computed(() => Math.max(0, Math.ceil((cooldownUntil.value - now.value) / 1000)))
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
let timer: ReturnType<typeof setInterval> | undefined
let alive = true

function readCooldown() {
  try {
    const value = Number(localStorage.getItem(COOLDOWN_KEY))
    cooldownUntil.value = Number.isFinite(value) ? value : 0
  } catch {
    /* Storage may be unavailable; server limits still apply. */
  }
  now.value = Date.now()
}
function startCooldown() {
  cooldownUntil.value = Date.now() + 60_000
  now.value = Date.now()
  try {
    localStorage.setItem(COOLDOWN_KEY, String(cooldownUntil.value))
  } catch {}
}
function storageChanged(event: StorageEvent) {
  if (event.key === COOLDOWN_KEY) readCooldown()
}
function validateField(field: Field): boolean {
  const value = form[field].trim()
  let error = ''
  if (field === 'username') {
    if (value.length < 4 || value.length > 64) error = '账号需为 4～64 位'
    else if (!USERNAME_RE.test(value)) error = '仅支持字母、数字、下划线、点和中划线'
  } else if (field === 'password') {
    if (form.password.length < 8 || form.password.length > 64) error = '密码需为 8～64 位'
  } else if (field === 'confirm') {
    if (!form.confirm) error = '请再次输入密码'
    else if (form.password !== form.confirm) error = '两次输入的密码不一致'
  } else if (field === 'email') {
    if (!EMAIL_RE.test(value) || value.length > 128) error = '请输入有效的邮箱地址'
  } else if (!/^\d{6}$/.test(value)) error = '请输入邮件中的 6 位数字验证码'
  errors[field] = error
  return !error
}
watch(
  () => form.email,
  () => {
    form.emailCode = ''
    codeNotice.value = ''
    errors.email = ''
    errors.emailCode = ''
    requestError.value = ''
  },
)
for (const field of ['username', 'password', 'confirm', 'emailCode'] as const) {
  watch(
    () => form[field],
    () => {
      errors[field] = ''
      requestError.value = ''
    },
  )
}
async function sendCode(): Promise<void> {
  readCooldown()
  if (sending.value || submitting.value || remaining.value || !validateField('email')) return
  sending.value = true
  requestError.value = ''
  codeNotice.value = ''
  try {
    const sent = await authApi.sendRegistrationCode(form.email.trim())
    if (sent !== true) {
      if (!alive) return
      errors.emailCode = '验证码未能发送，请稍后重试'
      return
    }
    startCooldown()
    if (!alive) return
    errors.emailCode = ''
    codeNotice.value = '验证码已发送，请检查邮箱及垃圾邮件文件夹。'
  } catch (error) {
    if (alive) errors.emailCode = toErrorMessage(error)
  } finally {
    if (alive) sending.value = false
  }
}
async function submit(): Promise<void> {
  if (submitting.value || sending.value) return
  const valid = fields.map(validateField).every(Boolean)
  if (!valid) {
    const field = fields.find((item) => errors[item])
    if (field) document.getElementById(fieldIds[field])?.focus()
    return
  }
  requestError.value = ''
  submitting.value = true
  try {
    await authApi.register({
      username: form.username.trim(),
      password: form.password,
      email: form.email.trim(),
      emailCode: form.emailCode.trim(),
    })
    if (!alive) return
    message.success('注册成功，请使用新账号登录')
    await router.replace({
      name: 'login',
      query: { redirect: safeLocalRedirect(route.query.redirect, '/console/dashboard') },
    })
  } catch (error) {
    if (!alive) return
    if (error instanceof ApiError && error.code === 30401) errors.username = '该账号已被注册'
    else requestError.value = toErrorMessage(error)
  } finally {
    if (alive) submitting.value = false
  }
}
onMounted(() => {
  readCooldown()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  window.addEventListener('storage', storageChanged)
})
onBeforeUnmount(() => {
  alive = false
  if (timer) clearInterval(timer)
  window.removeEventListener('storage', storageChanged)
  form.password = ''
  form.confirm = ''
  form.emailCode = ''
})
</script>

<template>
  <auth-layout
    heading="创建账号"
    subheading="验证邮箱后，即可使用你的个人控制台。"
    brand-title="YunaNexus"
    brand-tagline="一个账号，连接你的工作空间。"
    brand-description="管理文件、接收通知和查看应用授权。邮箱将用于验证身份与找回密码。"
  >
    <n-alert v-if="requestError" type="error" class="register-error" role="alert">{{
      requestError
    }}</n-alert>
    <n-form novalidate label-placement="top" :disabled="submitting" @submit.prevent="submit">
      <n-form-item
        required
        label="账号"
        label-for="register-username"
        :validation-status="errors.username ? 'error' : undefined"
        :feedback="errors.username"
      >
        <n-input
          v-model:value="form.username"
          :input-props="{ id: 'register-username', name: 'username' }"
          autocomplete="username"
          placeholder="4～64 位字母、数字或 _ . -"
          :maxlength="64"
          @blur="validateField('username')"
        />
      </n-form-item>
      <n-form-item
        required
        label="邮箱"
        label-for="register-email"
        :validation-status="errors.email ? 'error' : undefined"
        :feedback="errors.email"
      >
        <n-input
          v-model:value="form.email"
          :input-props="{ id: 'register-email', name: 'email', inputmode: 'email' }"
          autocomplete="email"
          placeholder="用于接收验证码和找回密码"
          :maxlength="128"
          :disabled="sending"
          @blur="validateField('email')"
        />
      </n-form-item>
      <n-form-item
        required
        label="邮箱验证码"
        label-for="register-email-code"
        :validation-status="errors.emailCode ? 'error' : undefined"
        :feedback="errors.emailCode"
      >
        <div class="email-code">
          <n-input
            v-model:value="form.emailCode"
            :input-props="{
              id: 'register-email-code',
              name: 'emailCode',
              inputmode: 'numeric',
            }"
            autocomplete="one-time-code"
            placeholder="6 位数字"
            :maxlength="6"
          />
          <n-button :loading="sending" :disabled="submitting || remaining > 0" @click="sendCode">{{
            remaining ? `${remaining} 秒后重发` : '发送验证码'
          }}</n-button>
        </div>
      </n-form-item>
      <p v-if="codeNotice" class="code-notice" role="status">{{ codeNotice }}</p>
      <n-form-item
        required
        label="密码"
        label-for="register-password"
        :validation-status="errors.password ? 'error' : undefined"
        :feedback="errors.password"
      >
        <n-input
          v-model:value="form.password"
          :input-props="{ id: 'register-password', name: 'password' }"
          autocomplete="new-password"
          type="password"
          show-password-on="click"
          placeholder="8～64 位"
          :maxlength="64"
          @blur="validateField('password')"
        />
      </n-form-item>
      <n-form-item
        required
        label="确认密码"
        label-for="register-confirm"
        :validation-status="errors.confirm ? 'error' : undefined"
        :feedback="errors.confirm"
      >
        <n-input
          v-model:value="form.confirm"
          :input-props="{ id: 'register-confirm', name: 'confirmPassword' }"
          autocomplete="new-password"
          type="password"
          show-password-on="click"
          placeholder="再次输入密码"
          :maxlength="64"
          @blur="validateField('confirm')"
        />
      </n-form-item>
      <n-button
        attr-type="submit"
        type="primary"
        block
        size="large"
        :loading="submitting"
        :disabled="sending"
        >创建账号</n-button
      >
    </n-form>
    <template #footer>
      <p>
        已有账号？<router-link
          :to="{
            name: 'login',
            query: { redirect: safeLocalRedirect(route.query.redirect, '/console/dashboard') },
          }"
          >登录</router-link
        >
      </p>
    </template>
  </auth-layout>
</template>

<style scoped>
.register-error {
  margin-bottom: 18px;
}
.email-code {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.email-code .n-input {
  min-width: 0;
  flex: 1;
}
.code-notice {
  color: var(--yuna-gray-700);
  font-size: 12px;
  line-height: 1.6;
  margin: -8px 0 18px;
}
</style>
