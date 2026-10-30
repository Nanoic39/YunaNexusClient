import { createRouter, createWebHistory } from 'vue-router'

/**
 * 管理端路由（重构中）。
 *
 * 旧路由已随页面一并删除；新页面完成后在此逐条登记。
 * 目前只保留一个占位路由，保证应用可启动。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:pathMatch(.*)*',
      name: 'rebuild',
      component: () => import('@/views/RebuildPlaceholder.vue'),
      meta: { title: '重构中' },
    },
  ],
})

export { router }
export default router
