import { createRouter, createWebHistory } from 'vue-router'
import { session, loadCurrentUser } from '@yuna/core'
import { adminRoutes } from './admin.routes'
import { portalRoutes } from './portal.routes'
import { publicRoutes } from './public.routes'
import { accessDecision } from './policy'
import { navigationError, failedPath } from '../app/navigation-error'
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    publicRoutes,
    {
      path: '/login',
      name: 'login',
      component: () => import('../features/auth/pages/Login.vue'),
      meta: { public: true, title: '登录' },
    },
    ...[403, 404, 418].map((code) => ({
      path: `/${code}`,
      name: `status-${code}`,
      component: () => import('../features/status/pages/Status.vue'),
      props: { code },
      meta: { public: true, title: String(code) },
    })),
    adminRoutes,
    portalRoutes,
    { path: '/users', redirect: '/console/users' },
    { path: '/forbidden', redirect: '/403' },
    { path: '/:pathMatch(.*)*', redirect: '/404' },
  ],
})
router.beforeEach(async (to) => {
  if (to.meta.public) {
    document.title = `${to.meta.title} · YunaNexus`
    return true
  }
  if (session.isAuthenticated.value && !(await loadCurrentUser(0))) {
    // 网络/服务错误不能被误判为无权限；让路由错误边界提供重试。
    if (session.isAuthenticated.value) throw new Error('暂时无法验证账户权限，请重试')
  }
  const decision = accessDecision(
    session.isAuthenticated.value,
    session.canAccessAdmin.value,
    Boolean(to.meta.requiresAdmin),
  )
  if (decision === 'login') return { name: 'login', query: { redirect: to.fullPath } }
  if (decision === 'forbidden') return '/403'
  document.title = `${to.meta.title ?? '工作区'} · YunaNexus`
  return true
})

router.onError((error, to) => {
  navigationError.value = error instanceof Error ? error.message : '页面加载失败'
  failedPath.value = to.fullPath
})
router.afterEach((_to, _from, failure) => {
  if (!failure) navigationError.value = ''
})
