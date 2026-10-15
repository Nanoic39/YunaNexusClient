import { h } from 'vue'
import type { Component } from 'vue'
import { NIcon } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { InformationCircleOutline, PersonCircleOutline, SpeedometerOutline } from '@vicons/ionicons5'

/**
 * 用户端控制台导航菜单。
 *
 * `key` 与路由 `path` 保持一致（控制台统一挂在 `/console` 前缀下），
 * 布局层据此完成「选中态 ↔ 路由」的同步。
 *
 * 站内信不再占据侧栏入口，改由顶栏通知面板 / 概览页「查看全部」进入独立页面。
 */
function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

export const userMenuOptions: MenuOption[] = [
  {
    key: '/console/dashboard',
    label: '概览',
    icon: renderIcon(SpeedometerOutline),
  },
  {
    key: '/console/profile',
    label: '个人中心',
    icon: renderIcon(PersonCircleOutline),
  },
  {
    key: '/console/about',
    label: '关于',
    icon: renderIcon(InformationCircleOutline),
  },
]
