import { createRouter, createWebHistory } from 'vue-router'
import { session } from '@yuna/core'

/**
 * 管理端路由。
 *
 * 旧页面已全部删除（快照见 tag legacy-frontend-before-rebuild），
 * 新页面按后端接口重建，逐条登记在此。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true, title: '登录' },
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

router.beforeEach((to) => {
  const authed = Boolean(session.state.accessToken)
  if (!to.meta.public && !authed) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && authed) return { path: '/users' }
  return true
})

export default router
