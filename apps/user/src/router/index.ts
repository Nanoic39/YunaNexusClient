import { recoverRouteChunk } from '@yuna/core'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { session, siteContent } from '@yuna/core'

/**
 * 用户端路由。
 *
 * 分为两部分：
 * - 公开门户（`/`、`/about` 与自定义内容页）：无需登录，由 `PortalLayout` 承载；
 * - 控制台（`/console/*`）：需登录，由 `UserLayout` 承载。
 *
 * 门户内容由 `siteContent` 数据驱动，自定义页面通过末尾的兜底路由按路径解析，
 * 因此管理端新增页面无需改动此处的路由表。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/oauth/authorize',
    name: 'oauth-consent',
    component: () => import('@/views/OAuthConsentView.vue'),
    meta: { title: '应用授权' },
  },
  {
    path: '/password-reset',
    name: 'password-reset',
    component: () => import('@/views/PasswordResetView.vue'),
    meta: { public: true, title: '找回密码' },
  },

  {
    path: '/share',
    name: 'shared-file',
    component: () => import('@/views/SharedFileView.vue'),
    meta: { public: true, title: '文件分享' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: '/unlock-appeal',
    name: 'unlock-appeal',
    component: () => import('@/views/UnlockAppealView.vue'),
    meta: { public: true, title: '解锁申诉' },
  },
  {
    path: '/',
    component: () => import('@/layouts/PortalLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/ContentPageView.vue'),
        meta: { public: true, title: '首页' },
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/ContentPageView.vue'),
        meta: { public: true, title: '关于' },
      },
    ],
  },
  {
    path: '/console',
    component: () => import('@/layouts/UserLayout.vue'),
    redirect: '/console/dashboard',
    children: [
      {
        path: 'oauth-apps/:id/access',
        name: 'application-access',
        component: () => import('@/views/ApplicationAccessView.vue'),
        meta: { title: '应用业务权限' },
      },
      {
        path: 'points',
        name: 'points',
        component: () => import('@/views/PointsView.vue'),
        meta: { title: '积分与签到' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { title: '账号设置' },
      },
      {
        path: 'files',
        name: 'files',
        component: () => import('@/views/FilesView.vue'),
        meta: { title: '我的文件' },
      },
      {
        path: 'shares',
        name: 'shares',
        component: () => import('@/views/SharesView.vue'),
        meta: { title: '我的分享' },
      },
      {
        path: 'applications',
        name: 'applications',
        component: () => import('@/views/SecurityView.vue'),
        meta: { title: '已授权应用' },
      },
      {
        path: 'api-keys',
        name: 'api-keys',
        component: () => import('@/views/SecurityView.vue'),
        meta: { title: '个人 API Key' },
      },
      {
        path: 'oauth-apps',
        name: 'oauth-apps',
        component: () => import('@/views/OAuthAppsView.vue'),
        meta: { title: '应用接入' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '概览' },
      },
      {
        path: 'messages',
        name: 'messages',
        component: () => import('@/views/MessagesView.vue'),
        meta: { title: '站内信' },
      },
      {
        path: 'messages/:noticeId',
        name: 'message-detail',
        component: () => import('@/views/MessageDetailView.vue'),
        meta: { title: '通知详情' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: 'about',
        name: 'console-about',
        component: () => import('@/views/ConsoleAboutView.vue'),
        meta: { title: '关于' },
      },
    ],
  },
  {
    // 门户兜底：匹配管理端新增的自定义内容页；未命中时由内容页展示 404
    path: '/:pathMatch(.*)*',
    component: () => import('@/layouts/PortalLayout.vue'),
    children: [
      {
        path: '',
        name: 'portal-content',
        component: () => import('@/views/ContentPageView.vue'),
        meta: { public: true },
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** 门户公开访问；控制台以「是否持有访问令牌」作为登录态判据 */
router.beforeEach((to) => {
  if (to.meta.public || session.isAuthenticated.value) return true
  return { name: 'login', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? siteContent.findPage(to.path)?.title
  document.title = title ? `${title} · YunaNexus` : 'YunaNexus'
})

router.onError((error, to) => {
  recoverRouteChunk(error, to.fullPath)
})
