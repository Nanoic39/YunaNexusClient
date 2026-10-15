import type { Router } from 'vue-router'
import { ApiError, session, toErrorMessage } from '@yuna/core'

/**
 * 统一异常处理：鉴权失效时清空会话并跳转登录，其余情况透出可读文案。
 */
export function handleApiError(error: unknown, router: Router): string {
  if (error instanceof ApiError && error.isUnauthorized) {
    session.clearUser()
    void router.replace({ name: 'login' })
    return '登录状态已失效，请重新登录'
  }
  return toErrorMessage(error)
}
