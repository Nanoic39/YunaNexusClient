<script setup lang="ts">
/**
 * 管理端登录。
 *
 * 视觉基准（用户已确认）：单一画布 + 居中玻璃卡片 + 胶囊分段切换两种登录方式。
 * 不使用左右分栏，不堆叠两套表单。
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { authApi, session } from '@yuna/core'
import { Surface } from '@yuna/ui'

const router = useRouter()
const message = useMessage()

const mode = ref<'password' | 'code'>('password')
const submitting = ref(false)
const sending = ref(false)
const cooldown = ref(0)
const error = ref('')

const form = reactive({ account: '', password: '' })
const emailForm = reactive({ email: '', code: '' })

function startCooldown(): void {
  cooldown.value = 60
  const timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function sendCode(): Promise<void> {
  error.value = ''
  if (!emailForm.email.trim()) {
    error.value = '请输入邮箱'
    return
  }
  sending.value = true
  try {
    await authApi.sendEmailCode(emailForm.email.trim(), 'LOGIN')
    startCooldown()
    message.success('验证码已发送')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发送失败'
  } finally {
    sending.value = false
  }
}

async function submitPassword(): Promise<void> {
  error.value = ''
  if (!form.account.trim() || !form.password) {
    error.value = '请填写账号与密码'
    return
  }
  submitting.value = true
  try {
    const result = await authApi.login({
      username: form.account.trim(),
      password: form.password,
      clientCode: 'web',
    })
    session.setTokens(result, 'web')
    await router.replace('/users')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    submitting.value = false
  }
}

async function submitCode(): Promise<void> {
  error.value = ''
  if (!emailForm.email.trim() || !emailForm.code.trim()) {
    error.value = '请填写邮箱与验证码'
    return
  }
  submitting.value = true
  try {
    const result = await authApi.loginByEmailCode({
      email: emailForm.email.trim(),
      emailCode: emailForm.code.trim(),
      clientCode: 'web',
    })
    session.setTokens(result, 'web')
    await router.replace('/users')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="canvas">
    <Surface class="card" :padded="false">
      <div class="brand"><span class="mark">Y</span><b>YunaNexus</b></div>
      <h1>登录</h1>
      <p class="sub">使用账号密码或邮箱验证码登录</p>

      <div class="seg">
        <button type="button" :class="{ on: mode === 'password' }" @click="mode = 'password'">
          密码登录
        </button>
        <button type="button" :class="{ on: mode === 'code' }" @click="mode = 'code'">
          验证码登录
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <form v-if="mode === 'password'" @submit.prevent="submitPassword">
        <label for="account">账号或邮箱</label>
        <input id="account" v-model="form.account" autocomplete="username" placeholder="输入账号或绑定邮箱" />
        <label for="password">密码</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          placeholder="输入密码"
        />
        <button class="primary" type="submit" :disabled="submitting">登录</button>
      </form>

      <form v-else @submit.prevent="submitCode">
        <label for="email">邮箱</label>
        <input id="email" v-model="emailForm.email" autocomplete="email" placeholder="输入注册邮箱" />
        <label for="code">验证码</label>
        <div class="row">
          <input id="code" v-model="emailForm.code" maxlength="6" placeholder="6 位验证码" />
          <button class="ghost" type="button" :disabled="sending || cooldown > 0" @click="sendCode">
            {{ cooldown > 0 ? `${cooldown}s 后重发` : '发送验证码' }}
          </button>
        </div>
        <button class="primary" type="submit" :disabled="submitting">验证码登录</button>
      </form>
    </Surface>
  </div>
</template>

<style scoped>
.canvas {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(900px 560px at 6% 4%, #dceffa 0%, transparent 58%),
    radial-gradient(760px 520px at 94% 10%, #cfeaf7 0%, transparent 55%),
    radial-gradient(820px 600px at 78% 92%, #d9f7e8 0%, transparent 58%),
    linear-gradient(165deg, #f7f9fc, #eef1f7 55%, #f6f7fb);
}

.card {
  width: 380px;
  padding: 32px 28px 26px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 22px;
}

.mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--yuna-primary, #226f9b);
}

.brand b {
  font-size: 14px;
}

h1 {
  margin: 0 0 4px;
  font-size: 20px;
  letter-spacing: -0.2px;
  color: var(--yuna-ink, #1f2328);
}

.sub {
  margin: 0 0 18px;
  font-size: 12.5px;
  color: var(--yuna-ink-3, #8b949e);
}

.seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--yuna-ink, #1f2328) 6%, transparent);
  margin-bottom: 16px;
}

.seg button {
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  color: var(--yuna-ink-2, #57606a);
  cursor: pointer;
}

.seg button.on {
  background: var(--yuna-glass-surface-strong, #fff);
  color: var(--yuna-ink, #1f2328);
  font-weight: 600;
}

label {
  display: block;
  font-size: 12px;
  color: var(--yuna-ink-2, #57606a);
  margin: 0 0 6px;
}

input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  margin-bottom: 14px;
  font-size: 14px;
  color: var(--yuna-ink, #1f2328);
  background: color-mix(in srgb, var(--yuna-glass-surface-strong) 75%, transparent);
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 8px;
  outline: none;
}

input:focus {
  border-color: var(--yuna-primary, #226f9b);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--yuna-primary, #226f9b) 14%, transparent);
}

.row {
  display: flex;
  gap: 8px;
}

.row input {
  flex: 1;
}

.primary {
  width: 100%;
  height: 42px;
  border: 0;
  border-radius: 8px;
  background: var(--yuna-primary, #226f9b);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.primary:hover {
  background: var(--yuna-primary-hover, #1b5878);
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost {
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  color: var(--yuna-ink, #1f2328);
  cursor: pointer;
  white-space: nowrap;
}

.ghost:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--yuna-danger, #c3313a);
}
</style>
