import type { RouteRecordRaw } from 'vue-router'
export const portalRoutes: RouteRecordRaw = {
  path: '/usr',
  component: () => import('../layouts/PortalShell.vue'),
  children: [
    {
      path: 'settings',
      name: 'appearance',
      component: () => import('../features/portal/settings/pages/Appearance.vue'),
      meta: { title: '主题与外观' },
    },
    {
      path: '',
      name: 'account',
      component: () => import('../features/portal/account/pages/Account.vue'),
      meta: { title: '个人中心' },
    },
  ],
}
