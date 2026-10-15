import type { Router } from 'vue-router'
import { ApiError, session, toErrorMessage } from '@yuna/core'

/**
 * 统一处理后端异常。
 *
 * 鉴权失效（401 / 30501）时清除会话并跳转登录，返回可展示文案；
 * 其余异常直接透出后端 `msg`。视图层只需 `message.error(handleApiError(...))`。
 */
export function handleApiError(error: unknown, router: Router): string {
  if (error instanceof ApiError && error.isUnauthorized) {
    session.clearUser()
    void router.replace({ name: 'login' })
    return '登录状态已失效，请重新登录'
  }
  return toErrorMessage(error)
}
