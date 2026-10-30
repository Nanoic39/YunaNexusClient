<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import {
  ApiError,
  authApi,
  buildHandoffUrl,
  authorizeAdminRedirect,
  safeLocalRedirect,
  loadCurrentUser,
  readEnv,
  session,
  toErrorMessage,
} from '@yuna/core'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const env = readEnv()
const mockEnabled = computed(() => env.enableMock)

const form = reactive({ username: '', password: '', captcha: '' })
const captchaId = ref('')
const captchaCode = ref<string | null>(null)
const captchaImage = ref<string | null>(null)
const failCount = ref(0)
const submitting = ref(false)
const requestError = ref('')
const errors = reactive({ username: '', password: '', captcha: '' })
for (const field of ['username', 'password', 'captcha'] as const) {
  watch(
    () => form[field],
    () => {
      errors[field] = ''
      requestError.value = ''
    },
  )
}

/** 连续失败 3 次后启用验证码，与后端风控策略一致 */
const needCaptcha = computed(() => failCount.value >= 3)

/** 邮箱验证码登录（免密码）——与密码登录并列的第二条入口 */
const emailLogin = reactive({ email: '', code: '' })
const emailError = ref('')
const emailSubmitting = ref(false)
const codeSending = ref(false)
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(): void {
  codeCooldown.value = 60
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    codeCooldown.value -= 1
    if (codeCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function sendLoginCode(): Promise<void> {
  emailError.value = ''
  const email = emailLogin.email.trim()
  if (!email) {
    emailError.value = '请输入邮箱'
    return
  }
  codeSending.value = true
  try {
    const sent = await authApi.sendEmailCode(email, 'LOGIN')
    if (!sent) {
      emailError.value = '验证码发送失败，请稍后再试'
      return
    }
    startCooldown()
    message.success('验证码已发送，请查收邮箱')
  } catch (error) {
    emailError.value = toErrorMessage(error)
  } finally {
    codeSending.value = false
  }
}

async function submitEmailCode(): Promise<void> {
  if (emailSubmitting.value) return
  emailError.value = ''
  const email = emailLogin.email.trim()
  if (!email || !emailLogin.code.trim()) {
    emailError.value = '请填写邮箱与验证码'
    return
  }
  emailSubmitting.value = true
  try {
    const result = await authApi.loginByEmailCode({
      email,
      emailCode: emailLogin.code.trim(),
      clientCode: 'web',
    })
    session.setTokens(result, 'web')
    session.setNickname(result.nickname || email)
    await loadCurrentUser()
    message.success('登录成功')
    const redirect = resolveRedirect()
    if (isCrossApp(redirect)) {
      await goCrossApp(redirect)
      return
    }
    await router.replace(redirect)
  } catch (error) {
    emailError.value = toErrorMessage(error)
  } finally {
    emailSubmitting.value = false
  }
}

async function loadCaptcha(): Promise<void> {
  if (!form.username.trim()) {
    message.warning('请先输入账号')
    return
  }
  try {
    const result = await authApi.captcha(form.username.trim())
    captchaId.value = result.captchaId
    captchaCode.value = result.code
    captchaImage.value = result.imageDataUrl?.startsWith('data:image/png;base64,')
      ? result.imageDataUrl
      : null
    form.captcha = ''
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}

/** 登录后跳转目标；绝对地址（管理端）需走跨应用会话接驳 */
function resolveRedirect(): string {
  const value = route.query.redirect
  return typeof value === 'string' && /^https?:\/\//i.test(value)
    ? value
    : safeLocalRedirect(value, '/console/dashboard')
}

function isCrossApp(target: string): boolean {
  return /^https?:\/\//i.test(target)
}

/** 跨应用跳转：申请一次性授权码，使管理端免二次登录；无管理权限则退回控制台 */
async function goCrossApp(target: string): Promise<void> {
  // 角色视图尚未加载时先补拉，避免把「尚未加载」误判为「无管理权限」
  if (!session.state.rolesLoaded) await loadCurrentUser()
  if (!session.canEnterAdmin.value) {
    message.error(
      session.state.rolesLoaded ? '当前账号无管理后台访问权限' : '权限信息加载失败，请稍后重试',
    )
    void router.replace('/console/dashboard')
    return
  }
  try {
    window.location.href =
      route.query.sso_state || route.query.sso_challenge
        ? await authorizeAdminRedirect(target, route.query.sso_state, route.query.sso_challenge)
        : buildHandoffUrl(target)
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      session.clearUser()
      message.warning('统一登录已过期，请重新登录')
      return
    }
    message.error(toErrorMessage(error))
    void router.replace('/console/dashboard')
  }
}

/** 已登录时直接放行，避免重复登录（含从管理端回跳的统一登录） */
onMounted(async () => {
  if (!session.isAuthenticated.value) return
  await loadCurrentUser()
  if (!session.isAuthenticated.value) return
  const redirect = resolveRedirect()
  if (isCrossApp(redirect)) {
    await goCrossApp(redirect)
    return
  }
  void router.replace(redirect)
})

async function submit(): Promise<void> {
  if (submitting.value) return
  const username = form.username.trim()
  errors.username = username ? '' : '请输入账号或邮箱'
  errors.password = form.password ? '' : '请输入密码'
  errors.captcha = needCaptcha.value && !form.captcha.trim() ? '请输入图形验证码' : ''
  const invalid = (['username', 'password', 'captcha'] as const).find((field) => errors[field])
  if (invalid) {
    document.getElementById(`login-${invalid}`)?.focus()
    return
  }

  requestError.value = ''
  submitting.value = true
  try {
    const result = await authApi.login({
      username,
      password: form.password,
      clientCode: 'web',
      captchaId: needCaptcha.value ? captchaId.value : undefined,
      captcha: needCaptcha.value ? form.captcha.trim() : undefined,
    })
    session.setTokens(result, 'web')
    session.setNickname(result.nickname || username)
    await loadCurrentUser()
    message.success('登录成功')
    const redirect = resolveRedirect()
    if (isCrossApp(redirect)) {
      await goCrossApp(redirect)
      return
    }
    await router.replace(redirect)
  } catch (error) {
    if (error instanceof ApiError && error.code === 30001) {
      failCount.value += 1
      if (needCaptcha.value) void loadCaptcha()
    } else if (error instanceof ApiError && [30004, 30005].includes(error.code)) {
      failCount.value = Math.max(3, failCount.value)
      void loadCaptcha()
    }
    requestError.value = toErrorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <auth-layout
    heading="登录"
    subheading="使用账号或邮箱登录你的个人控制台。"
    brand-title="YunaNexus"
    brand-tagline="一个账号，连接你的工作空间。"
    brand-description="管理文件、接收通知和查看应用授权。"
  >
    <n-alert v-if="requestError" type="error" class="login-error" role="alert">{{
      requestError
    }}</n-alert>
    <n-form novalidate label-placement="top" :disabled="submitting" @submit.prevent="submit">
      <n-form-item
        required
        label="账号或邮箱"
        label-for="login-username"
        :validation-status="errors.username ? 'error' : undefined"
        :feedback="errors.username"
      >
        <n-input
          v-model:value="form.username"
          :input-props="{ id: 'login-username', name: 'username' }"
          autocomplete="username"
          size="large"
          placeholder="输入账号或绑定邮箱"
          :maxlength="128"
        />
      </n-form-item>
      <n-form-item
        required
        label="密码"
        label-for="login-password"
        :validation-status="errors.password ? 'error' : undefined"
        :feedback="errors.password"
      >
        <n-input
          v-model:value="form.password"
          :input-props="{ id: 'login-password', name: 'password' }"
          autocomplete="current-password"
          type="password"
          show-password-on="click"
          size="large"
          placeholder="输入密码"
          :maxlength="64"
        />
      </n-form-item>
      <n-form-item
        v-if="needCaptcha"
        required
        label="图形验证码"
        label-for="login-captcha"
        :validation-status="errors.captcha ? 'error' : undefined"
        :feedback="errors.captcha"
      >
        <div class="captcha">
          <n-input
            v-model:value="form.captcha"
            :input-props="{ id: 'login-captcha', name: 'captcha' }"
            autocomplete="off"
            size="large"
            placeholder="输入图片中的字符"
          />
          <button
            v-if="captchaImage"
            type="button"
            class="captcha-image"
            :disabled="submitting"
            aria-label="刷新图形验证码"
            @click="loadCaptcha"
          >
            <img :src="captchaImage" alt="图形验证码，点击可刷新" />
          </button>
          <n-button v-else size="large" @click="loadCaptcha">获取验证码</n-button>
        </div>
      </n-form-item>
      <n-button attr-type="submit" type="primary" block size="large" :loading="submitting"
        >登录</n-button
      >
    </n-form>
    <n-divider>或使用邮箱验证码登录</n-divider>
    <n-alert v-if="emailError" type="error" role="alert" style="margin-bottom: 12px">{{ emailError }}</n-alert>
    <n-form label-placement="top" :disabled="emailSubmitting" @submit.prevent="submitEmailCode">
      <n-form-item label="邮箱" label-for="login-email">
        <n-input
          v-model:value="emailLogin.email"
          :input-props="{ id: 'login-email', name: 'email' }"
          autocomplete="email"
          size="large"
          placeholder="输入注册邮箱"
          :maxlength="128"
        />
      </n-form-item>
      <n-form-item label="验证码" label-for="login-email-code">
        <n-space style="width: 100%" :wrap="false">
          <n-input
            v-model:value="emailLogin.code"
            :input-props="{ id: 'login-email-code', name: 'emailCode' }"
            autocomplete="one-time-code"
            size="large"
            placeholder="6 位验证码"
            :maxlength="6"
          />
          <n-button size="large" :loading="codeSending" :disabled="codeCooldown > 0" @click="sendLoginCode">
            {{ codeCooldown > 0 ? `${codeCooldown}s 后重发` : '发送验证码' }}
          </n-button>
        </n-space>
      </n-form-item>
      <n-button type="primary" block size="large" :loading="emailSubmitting" @click="submitEmailCode">
        验证码登录
      </n-button>
    </n-form>
    <p v-if="needCaptcha && captchaCode" class="hint">Mock 验证码：{{ captchaCode }}</p>
    <template #footer>
      <div class="auth-links">
        <div class="account-links">
          <span>还没有账号？</span
          ><router-link
            :to="{
              name: 'register',
              query: { redirect: safeLocalRedirect(route.query.redirect, '/console/dashboard') },
            }"
            >创建账号</router-link
          >
        </div>
        <nav class="recovery-links" aria-label="登录帮助">
          <router-link to="/password-reset">找回密码</router-link
          ><router-link :to="{ name: 'unlock-appeal' }">账号解锁申诉</router-link>
        </nav>
      </div>
      <p v-if="mockEnabled" class="hint">
        当前为 <strong>Mock 模式</strong>，任意账号均可登录；密码输入
        <code>wrong</code> 可模拟登录失败。
      </p>
    </template>
  </auth-layout>
</template>

<style scoped>
.login-error {
  margin-bottom: 18px;
}
.captcha {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}
.captcha-image {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  flex: 0 0 136px;
}
.captcha-image img {
  display: block;
  width: 136px;
  height: 40px;
}
.captcha .n-input {
  min-width: 0;
  flex: 1 1 auto;
}
.hint {
  font-size: 12px;
  line-height: 1.7;
  color: var(--yuna-gray-700);
}
.auth-links {
  display: grid;
  gap: 14px;
}
.account-links,
.recovery-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.account-links {
  gap: 8px;
}
.auth-links a {
  color: var(--yuna-primary);
  text-decoration: none;
}
.auth-links a:hover {
  text-decoration: underline;
}
.auth-links a:focus-visible,
.captcha-image:focus-visible {
  outline: 2px solid var(--yuna-primary);
  outline-offset: 3px;
}
</style>
