import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, session, toErrorMessage } from '@yuna/core'
export function useLogout() {
  const router = useRouter()
  const busy = ref(false)
  const error = ref('')
  async function logout() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      await authApi.logout()
      // 先进入公开首页再清本地状态，避免私有页的失效监听把主动退出送回登录。
      try {
        await router.replace('/')
      } finally {
        session.clearAll()
      }
    } catch (e) {
      error.value = toErrorMessage(e)
    } finally {
      busy.value = false
    }
  }
  return { logout, busy, error }
}
