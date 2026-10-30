<script setup lang="ts">
import WorkspaceBrand from '../../../app/components/WorkspaceBrand.vue'
import DayNightToggle from '../../../app/components/DayNightToggle.vue'
import { session } from '@yuna/core'
import { useLogout } from '../composables/useLogout'
import { useLogin } from '../composables/useLogin'
const { logout, error: logoutError } = useLogout()
const {
  mode,
  username,
  password,
  email,
  code,
  captcha,
  captchaAnswer,
  busy,
  error,
  notice,
  remaining,
  sendDisabled,
  sendCode,
  submit,
} = useLogin()
</script>
<template>
  <div class="login-page">
    <header class="login-topbar">
      <RouterLink to="/" aria-label="返回首页"><WorkspaceBrand /></RouterLink><DayNightToggle />
    </header>
    <main class="login-main">
      <section class="login-card" aria-labelledby="login-title">
        <header class="login-heading">
          <h1 id="login-title">登录你的工作区</h1>
          <p>欢迎回来，继续连接你的工作。</p>
        </header>
        <template v-if="session.isAuthenticated.value">
          <div class="signed-in">
            <span class="account-dot" />{{ session.state.nickname || '当前账户已登录' }}
          </div>
          <div class="signed-actions">
            <button class="workspace-button primary" :disabled="busy" @click="submit">
              继续进入</button
            ><button class="workspace-button quiet" :disabled="busy" @click="logout">
              切换账户
            </button>
          </div>
          <p class="feedback workspace-error" role="alert">{{ error || logoutError }}</p>
        </template>
        <template v-else>
          <div class="login-segments" role="group" aria-label="登录方式">
            <button
              type="button"
              :class="{ active: mode === 'password' }"
              :aria-pressed="mode === 'password'"
              :disabled="busy"
              @click="mode = 'password'"
            >
              密码登录</button
            ><button
              type="button"
              :class="{ active: mode === 'email' }"
              :aria-pressed="mode === 'email'"
              :disabled="busy"
              @click="mode = 'email'"
            >
              邮箱验证码
            </button>
          </div>
          <form class="login-form" @submit.prevent="submit">
            <template v-if="mode === 'password'">
              <label class="form-field"
                ><span>账号或邮箱</span
                ><input
                  v-model="username"
                  class="workspace-input"
                  autocomplete="username"
                  placeholder="输入账号或邮箱"
                  required
                  maxlength="128"
                  :disabled="busy"
              /></label>
              <label class="form-field"
                ><span>密码</span
                ><input
                  v-model="password"
                  class="workspace-input"
                  type="password"
                  autocomplete="current-password"
                  placeholder="输入密码"
                  required
                  :disabled="busy"
              /></label>
              <label v-if="captcha?.imageDataUrl" class="form-field"
                ><span>图形验证码</span
                ><img :src="captcha.imageDataUrl" alt="请输入图中的验证码" /><input
                  v-model="captchaAnswer"
                  class="workspace-input"
                  autocomplete="off"
                  required
                  :disabled="busy"
              /></label>
            </template>
            <template v-else>
              <label class="form-field"
                ><span>邮箱</span
                ><input
                  v-model="email"
                  class="workspace-input"
                  type="email"
                  autocomplete="email"
                  placeholder="输入你的邮箱"
                  required
                  maxlength="128"
                  :disabled="busy"
              /></label>
              <div class="code-row">
                <label class="form-field"
                  ><span>验证码</span
                  ><input
                    v-model="code"
                    class="workspace-input"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    placeholder="6 位验证码"
                    pattern="[0-9]{6}"
                    maxlength="6"
                    required
                    :disabled="busy" /></label
                ><button
                  type="button"
                  class="workspace-button"
                  :disabled="sendDisabled || !email"
                  @click="sendCode"
                >
                  {{ remaining ? `${remaining}s 后重发` : '发送验证码' }}
                </button>
              </div>
            </template>
            <div class="feedback" aria-live="polite">
              <p v-if="error" class="workspace-error" role="alert">{{ error }}</p>
              <p v-else-if="notice" class="send-notice">{{ notice }}</p>
            </div>
            <button class="workspace-button primary submit-button" :disabled="busy">
              {{ busy ? '正在登录…' : '登录' }}
            </button>
          </form>
        </template>
      </section>
      <p class="login-note">一个账户，访问你的全部工作空间。</p>
    </main>
    <footer class="login-footer">YunaNexus · 统一账户</footer>
  </div>
</template>
<style scoped>
.login-page {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--ws-canvas);
}
.login-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ws-gap-6) var(--ws-gap-8);
}
.login-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--ws-gap-6);
}
.login-card {
  width: min(100%, var(--ws-auth-width));
  padding: var(--ws-auth-padding);
  border: 1px solid var(--ws-line);
  border-radius: var(--ws-radius-lg);
  background: var(--ws-panel);
  box-shadow: var(--ws-shadow);
}
.login-heading {
  margin-bottom: var(--ws-gap-6);
}
.login-heading h1 {
  font-size: var(--ws-font-page);
  font-weight: 600;
  line-height: 1.5;
  margin: 0 0 var(--ws-gap-2);
}
.login-heading p {
  font-size: var(--ws-font-control);
  color: var(--ws-muted);
}
.login-segments {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ws-gap-1);
  padding: var(--ws-gap-1);
  background: var(--ws-soft);
  border-radius: var(--ws-radius);
  margin-bottom: var(--ws-gap-6);
}
.login-segments button {
  height: var(--ws-icon-button);
  border: 0;
  border-radius: var(--yuna-radius-md);
  background: transparent;
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
  cursor: pointer;
}
.login-segments button.active {
  background: var(--ws-surface);
  color: var(--ws-ink);
  font-weight: 600;
}
.login-form {
  display: grid;
  gap: var(--ws-gap-4);
}
.form-field {
  display: grid;
  gap: var(--ws-gap-2);
  font-size: var(--ws-font-control);
  color: var(--ws-ink);
}
.form-field > span {
  font-weight: 500;
}
.login-form .workspace-input,
.login-form .workspace-button,
.signed-actions .workspace-button {
  height: var(--ws-auth-control);
}
.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ws-gap-2);
  align-items: end;
}
.feedback {
  min-height: var(--ws-gap-5);
  margin-top: calc(-1 * var(--ws-gap-2));
  font-size: var(--ws-font-caption);
}
.send-notice {
  color: var(--yuna-success);
}
.submit-button {
  width: 100%;
  margin-top: calc(-1 * var(--ws-gap-2));
}
.login-note {
  margin-top: var(--ws-gap-5);
  color: var(--ws-muted);
  font-size: var(--ws-font-caption);
}
.login-footer {
  padding: var(--ws-gap-6);
  color: var(--ws-faint);
  font-size: var(--ws-font-caption);
  text-align: center;
}
.signed-in {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
  font-size: var(--ws-font-control);
  margin-block: var(--ws-gap-6);
}
.account-dot {
  width: var(--ws-gap-2);
  height: var(--ws-gap-2);
  border-radius: 50%;
  background: var(--yuna-success);
}
.signed-actions {
  display: grid;
  gap: var(--ws-gap-2);
  margin-bottom: var(--ws-gap-4);
}
img {
  max-width: 100%;
}
@media (max-width: 600px) {
  .login-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--ws-gap-5);
  }
  .login-card {
    padding: var(--ws-gap-6);
  }
  .login-main {
    padding: var(--ws-gap-4);
  }
}
</style>
