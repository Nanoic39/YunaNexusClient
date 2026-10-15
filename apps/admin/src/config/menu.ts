import { h } from 'vue'
import type { Component } from 'vue'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import {
  DocumentTextOutline,
  GlobeOutline,
  PeopleOutline,
  ShieldCheckmarkOutline,
  SpeedometerOutline,
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
    key: 'system',
    label: '系统管理',
    icon: renderIcon(ShieldCheckmarkOutline),
    children: [
      {
        key: '/users',
        label: '用户管理',
        icon: renderIcon(PeopleOutline),
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
]
