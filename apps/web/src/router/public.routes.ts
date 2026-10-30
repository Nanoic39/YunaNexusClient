import type { RouteRecordRaw } from 'vue-router'
export const publicRoutes: RouteRecordRaw = {
  path: '/',
  component: () => import('../layouts/PublicShell.vue'),
  meta: { public: true },
  children: [
    {
      path: '',
      name: 'home',
      component: () => import('../features/public/pages/Home.vue'),
      meta: { title: '首页' },
    },
    {
      path: 'about',
      name: 'about',
      component: () => import('../features/public/pages/About.vue'),
      meta: { title: '关于' },
    },
  ],
}
