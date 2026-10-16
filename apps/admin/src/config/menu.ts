import { h } from 'vue'
import type { Component } from 'vue'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  AlbumsOutline,
  AlertCircleOutline,
  BusinessOutline,
  DocumentTextOutline,
  ExtensionPuzzleOutline,
  FileTrayFullOutline,
  GlobeOutline,
  KeyOutline,
  LockClosedOutline,
  MedalOutline,
  MenuOutline,
  NotificationsOutline,
  PaperPlaneOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  SpeedometerOutline,
  StatsChartOutline,
} from '@vicons/ionicons5'

/**
 * 管理端导航菜单。
 *
 * `key` 与路由 `path` 保持一致，布局层据此完成「选中态 ↔ 路由」的同步；
 * 未实现的模块暂不展示，避免出现无效入口。
 */
function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

export const adminMenuOptions: MenuOption[] = [
  {
    key: '/overview',
    label: '概览',
    icon: renderIcon(SpeedometerOutline),
  },
  {
    key: '/analytics',
    label: '数据分析',
    icon: renderIcon(StatsChartOutline),
  },
  {
    key: 'system',
    label: '系统管理',
    icon: renderIcon(ShieldCheckmarkOutline),
    children: [
      { key: '/password-resets', label: '密码重置记录', icon: renderIcon(LockClosedOutline) },
      {
        key: '/users',
        label: '用户管理',
        icon: renderIcon(PeopleOutline),
      },
      {
        key: '/badges',
        label: '徽章管理',
        icon: renderIcon(MedalOutline),
      },
      {
        key: '/appeals',
        label: '申诉审核',
        icon: renderIcon(AlertCircleOutline),
      },
      {
        key: '/oauth-apps',
        label: '应用管理',
        icon: renderIcon(ExtensionPuzzleOutline),
      },
    ],
  },
  {
    key: 'permission',
    label: '权限管理',
    icon: renderIcon(LockClosedOutline),
    children: [
      {
        key: '/roles',
        label: '角色管理',
        icon: renderIcon(KeyOutline),
      },
      {
        key: '/permissions',
        label: '权限点',
        icon: renderIcon(LockClosedOutline),
      },
      {
        key: '/menus',
        label: '菜单管理',
        icon: renderIcon(MenuOutline),
      },
      {
        key: '/depts',
        label: '部门管理',
        icon: renderIcon(BusinessOutline),
      },
    ],
  },
  {
    key: 'portal',
    label: '门户管理',
    icon: renderIcon(GlobeOutline),
    children: [
      {
        key: '/content',
        label: '门户内容',
        icon: renderIcon(DocumentTextOutline),
      },
    ],
  },
  {
    key: 'notice',
    label: '通知管理',
    icon: renderIcon(NotificationsOutline),
    children: [
      {
        key: '/notice/templates',
        label: '通知模板',
        icon: renderIcon(AlbumsOutline),
      },
      {
        key: '/notice/send',
        label: '发送通知',
        icon: renderIcon(PaperPlaneOutline),
      },
      {
        key: '/notice/records',
        label: '发送记录',
        icon: renderIcon(FileTrayFullOutline),
      },
    ],
  },
]
