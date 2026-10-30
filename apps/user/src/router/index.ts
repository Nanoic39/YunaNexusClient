import { createRouter, createWebHistory } from 'vue-router'

/**
 * 用户端路由（重构中）。
 *
 * 旧页面已随重构删除（快照见 tag legacy-frontend-before-rebuild），
 * C 端在 B 端完成后按后端接口重建，当前只保留占位路由。
 */
export const router = createRouter({
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

export default router
