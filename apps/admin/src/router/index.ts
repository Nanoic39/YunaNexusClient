import { createRouter, createWebHistory } from 'vue-router'

/**
 * 管理端路由。
 *
 * 旧页面已全部删除（快照见 tag legacy-frontend-before-rebuild），
 * 新页面按后端接口重建，逐条登记在此。
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/users' },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/user/UserListView.vue'),
      meta: { title: '用户管理' },
    },
    { path: '/:pathMatch(.*)*', redirect: '/users' },
  ],
})

export default router
