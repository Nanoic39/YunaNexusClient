<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui'
import { AuthLayout } from '@yuna/ui'
import { ApiError, authApi, currentUserApi, readEnv, session, toErrorMessage } from '@yuna/core'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const env = readEnv()
const mockEnabled = computed(() => env.enableMock)

const form = reactive({ username: '', password: '', captcha: '' })
const captchaId = ref('')
const captchaCode = ref<string | null>(null)
const failCount = ref(0)
const submitting = ref(false)

/** 连续失败 3 次后启用验证码，与后端风控策略一致 */
const needCaptcha = computed(() => failCount.value >= 3)

async function loadCaptcha(): Promise<void> {
  if (!form.username.trim()) {
    message.warning('请先输入账号')
    return
  }
  try {
    const result = await authApi.captcha(form.username.trim())
    captchaId.value = result.captchaId
    captchaCode.value = result.code
  } catch (error) {
    message.error(toErrorMessage(error))
  }
}

/** 回填当前用户的角色 / 权限 / 菜单；失败不阻塞登录（按未持有管理角色处理） */
async function loadCurrentUser(): Promise<void> {
  try {
    session.setCurrentUser(await currentUserApi.me())
  } catch {
    /* 权限视图缺失时静默降级，登录流程继续 */
  }
}

async function submit(): Promise<void> {
  const username = form.username.trim()
  if (!username || !form.password) {
    message.warning('请输入账号与密码')
    return
  }
  if (needCaptcha.value && !form.captcha.trim()) {
    message.warning('请输入验证码')
    return
  }

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
    await loadCurrentUser()
    message.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/console/dashboard'
    await router.replace(redirect)
  } catch (error) {
    if (error instanceof ApiError && error.code === 30001) {
      failCount.value += 1
      if (needCaptcha.value) void loadCaptcha()
    }
    message.error(toErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout
    heading="登录用户端"
    subheading="使用账号密码登录，进入你的个人控制台"
    brand-title="YunaNexus"
    brand-tagline="统一中控台，集中管理用户、权限与审计。"
    brand-description="未来所有业务平台的统一底座。登录后可访问个人控制台，查看账号信息与站内消息。"
  >
    <template #brand>
      <ul class="yuna-points">
        <li>统一身份认证，一处登录全线通行</li>
        <li>站内信与安全提醒实时触达</li>
        <li>个人中心集中查看账号与会话</li>
      </ul>
    </template>

    <n-form :show-label="false" @submit.prevent="submit">
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.username"
          size="large"
          placeholder="用户名 / 邮箱 / 手机号"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item :show-label="false">
        <n-input
          v-model:value="form.password"
          type="password"
          show-password-on="click"
          size="large"
          placeholder="密码"
          @keyup.enter="submit"
        />
      </n-form-item>
      <n-form-item v-if="needCaptcha" :show-label="false">
        <div class="captcha">
          <n-input
            v-model:value="form.captcha"
            size="large"
            placeholder="验证码"
            @keyup.enter="submit"
          />
          <n-button size="large" quaternary @click="loadCaptcha">获取验证码</n-button>
        </div>
      </n-form-item>
      <n-button type="primary" block size="large" :loading="submitting" @click="submit">
        登录
      </n-button>
    </n-form>

    <p v-if="needCaptcha && captchaCode" class="hint">Mock 验证码：{{ captchaCode }}</p>

    <template #footer>
      <p v-if="mockEnabled">
        当前为 <strong>Mock 模式</strong>，任意账号均可登录；密码输入 <code>wrong</code> 可模拟登录失败。
      </p>
      <p v-else>如需开通账号，请联系平台管理员。</p>
    </template>
  </AuthLayout>
</template>

<style scoped>
.captcha {
  display: flex;
  gap: 8px;
  width: 100%;
}

.captcha .n-input {
  flex: 1 1 auto;
}

.hint {
  font-size: 12px;
  color: var(--yuna-gray-600);
}
</style>
