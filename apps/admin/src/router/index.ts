import { createRouter, createWebHistory } from 'vue-router'
import { buildSsoLoginUrl, consumeHandoff, session } from '@yuna/core'

/**
 * 管理端路由与鉴权。
 *
 * 认证模型：全平台只在用户端登录一次，管理端通过 SSO 复用会话，
 * 不做独立的账号密码登录。管理端只判断"是否具备后台权限"。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenView.vue'),
      meta: { public: true, title: '无访问权限' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminShell.vue'),
      children: [
        { path: '', redirect: '/users' },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/user/UserListView.vue'),
          meta: { title: '用户管理' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/users' },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true

  // SSO 回调：以 HttpOnly Cookie 换取一次性授权码并落 token
  if (!session.isAuthenticated.value) {
    await consumeHandoff()
  }

  if (!session.isAuthenticated.value) {
    const url = buildSsoLoginUrl(to.fullPath)
    if (url) {
      window.location.href = url
      return false
    }
    return { name: 'forbidden' }
  }

  if (!session.canAccessAdmin.value) return { name: 'forbidden' }
  return true
})

export default router
