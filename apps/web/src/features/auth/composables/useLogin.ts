import { computed, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi, session, loadCurrentUser, toErrorMessage, type CaptchaResult } from '@yuna/core'
import { clientConfig } from '../../../config/client'
import { loginDestination } from '../../../router/policy'
export function useLogin() {
  const route = useRoute()
  const router = useRouter()
  const mode = ref<'password' | 'email'>('password')
  const username = ref('')
  const password = ref('')
  const email = ref('')
  const code = ref('')
  const captcha = ref<CaptchaResult | null>(null)
  const captchaAnswer = ref('')
  const busy = ref(false)
  const sending = ref(false)
  const error = ref('')
  const notice = ref('')
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined
  const sendDisabled = computed(() => sending.value || busy.value || remaining.value > 0)
  onUnmounted(() => clearInterval(timer))
  async function sendCode() {
    if (sendDisabled.value) return
    sending.value = true
    error.value = ''
    notice.value = ''
    try {
      if (!(await authApi.sendEmailCode(email.value.trim(), 'LOGIN')))
        throw new Error('发送未成功，请稍后重试')
      notice.value = '验证码已发送，请查看邮箱'
      remaining.value = 60
      clearInterval(timer)
      timer = setInterval(() => {
        remaining.value = Math.max(0, remaining.value - 1)
        if (!remaining.value) clearInterval(timer)
      }, 1000)
    } catch (e) {
      error.value = toErrorMessage(e)
    } finally {
      sending.value = false
    }
  }
  async function submit() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      if (!session.isAuthenticated.value) {
        const result =
          mode.value === 'email'
            ? await authApi.loginByEmailCode({
                email: email.value.trim(),
                emailCode: code.value,
                clientCode: clientConfig.clientCode,
              })
            : await authApi.login({
                username: username.value.trim(),
                password: password.value,
                clientCode: clientConfig.clientCode,
                captchaId: captcha.value?.captchaId,
                captcha: captchaAnswer.value || undefined,
              })
        session.setTokens(result, clientConfig.clientCode)
        password.value = ''
        code.value = ''
        captchaAnswer.value = ''
      }
      if (!(await loadCurrentUser(0)))
        throw new Error('已登录，但暂时无法加载权限，请点击继续进入重试')
      await router.replace(loginDestination(route.query.redirect, session.canAccessAdmin.value))
    } catch (e) {
      error.value = toErrorMessage(e)
      if (mode.value === 'password' && !session.isAuthenticated.value) {
        try {
          captcha.value = await authApi.captcha(username.value.trim())
          captchaAnswer.value = ''
        } catch {
          /* 保留原始登录错误 */
        }
      }
    } finally {
      busy.value = false
    }
  }
  return {
    mode,
    username,
    password,
    email,
    code,
    captcha,
    captchaAnswer,
    busy,
    sending,
    error,
    notice,
    remaining,
    sendDisabled,
    sendCode,
    submit,
  }
}
