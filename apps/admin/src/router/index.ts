import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { session } from '@yuna/core'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: () => import('@/views/OverviewView.vue'),
        meta: { title: '概览' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/UserListView.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('@/views/RoleListView.vue'),
        meta: { title: '角色管理' },
      },
      {
        path: 'permissions',
        name: 'permissions',
        component: () => import('@/views/PermissionListView.vue'),
        meta: { title: '权限点' },
      },
      {
        path: 'menus',
        name: 'menus',
        component: () => import('@/views/MenuListView.vue'),
        meta: { title: '菜单管理' },
      },
      {
        path: 'depts',
        name: 'depts',
        component: () => import('@/views/DeptListView.vue'),
        meta: { title: '部门管理' },
      },
      {
        path: 'appeals',
        name: 'appeals',
        component: () => import('@/views/AppealListView.vue'),
        meta: { title: '申诉审核' },
      },
      {
        path: 'content',
        name: 'content',
        component: () => import('@/views/ContentEditorView.vue'),
        meta: { title: '门户内容' },
      },
      {
        path: 'notice/templates',
        name: 'notice-templates',
        component: () => import('@/views/NoticeTemplateListView.vue'),
        meta: { title: '通知模板' },
      },
      {
        path: 'notice/send',
        name: 'notice-send',
        component: () => import('@/views/NoticeSendView.vue'),
        meta: { title: '发送通知' },
      },
      {
        path: 'notice/records',
        name: 'notice-records',
        component: () => import('@/views/NoticeRecordListView.vue'),
        meta: { title: '发送记录' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { public: true, title: '无权访问' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 管理端登录态判据：已登录且持有根角色 `admin`（会话来自用户端统一登录 / 跨应用接驳）。
 * 已登录但缺少管理角色时进入 403，避免与用户端统一登录来回跳转。
 */
router.beforeEach((to) => {
  if (to.meta.public || session.canAccessAdmin.value) return true
  if (session.isAuthenticated.value) return { name: 'forbidden' }
  return { name: 'login', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · YunaNexus 管理台` : 'YunaNexus 管理台'
})
