import type { RouteRecordRaw } from 'vue-router'
export const adminRoutes: RouteRecordRaw = {
  path: '/console',
  component: () => import('../layouts/AdminShell.vue'),
  meta: { requiresAdmin: true },
  children: [
    { path: '', redirect: '/console/users' },
    {
      path: 'users',
      name: 'users',
      component: () => import('../features/admin/users/pages/UserList.vue'),
      meta: { title: '用户管理' },
    },
  ],
}
