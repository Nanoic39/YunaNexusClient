/**
 * 树节点右键菜单：给 Naive `n-tree` 挂 `:node-props` 就可以用。
 *
 * 为什么做成"工厂 + 默认项"而不是一个大而全的组件：
 * 树在不同页面承载不同实体（权限点、角色、菜单、部门），业务动作只能由页面提供；
 * 但"复制名称 / 复制标识 / 复制整棵子树标识 / 刷新"这类操作是共通的，
 * 统一在这里生成，保证 5 个页面的树右键长得一样、行为一样。
 */
import { openContextMenu } from './use-context-menu'
import type { ContextMenuItem } from './use-context-menu'

/** 只依赖用得到的字段，避免把 Naive 的 TreeOption 类型绑死到这里 */
export interface TreeMenuNode {
  key?: string | number
  label?: unknown
  children?: TreeMenuNode[]
}

/** 把节点 label（可能是渲染函数/字符串）降级成可复制文本 */
export function nodeLabelText(node: TreeMenuNode): string {
  return typeof node.label === 'string' ? node.label : String(node.key ?? '')
}

/** 递归收集某节点下所有后代的 key（含自身），用于"复制子树标识" */
export function collectNodeKeys(node: TreeMenuNode): Array<string | number> {
  const keys: Array<string | number> = []
  const walk = (current: TreeMenuNode): void => {
    if (current.key !== undefined) keys.push(current.key)
    for (const child of current.children ?? []) walk(child)
  }
  walk(node)
  return keys
}

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    // 剪贴板不可用时静默失败：右键菜单不该因为权限策略而报错弹窗
  }
}

export interface TreeMenuOptions {
  /** 业务动作，插在通用项之前 */
  extra?: ContextMenuItem[]
  /** 节点标识的显示名，如"权限标识/角色标识" */
  keyLabel?: string
  /** 复制整棵子树标识时使用的分隔符 */
  joinWith?: string
  /** 刷新动作（页面不传则不显示该项） */
  onRefresh?: () => void
}

/** 生成通用树节点菜单项 */
export function defaultTreeMenuItems(node: TreeMenuNode, options: TreeMenuOptions = {}): ContextMenuItem[] {
  const label = nodeLabelText(node)
  const keyText = node.key === undefined ? '' : String(node.key)
  const descendants = collectNodeKeys(node)
  const items: ContextMenuItem[] = [
    {
      key: 'copy-label',
      label: '复制名称',
      icon: 'copy',
      disabled: !label,
      onSelect: () => void writeClipboard(label),
    },
    {
      key: 'copy-key',
      label: `复制${options.keyLabel ?? '节点 ID'}`,
      icon: 'link',
      disabled: !keyText,
      onSelect: () => void writeClipboard(keyText),
    },
  ]
  if (descendants.length > 1) {
    items.push({
      key: 'copy-subtree',
      label: `复制整棵子树标识（${descendants.length} 项）`,
      icon: 'export',
      onSelect: () => void writeClipboard(descendants.join(options.joinWith ?? ',')),
    })
  }
  if (options.extra?.length) {
    items.push({ key: 'extra-divider', divider: true }, ...options.extra)
  }
  if (options.onRefresh) {
    items.push({
      key: 'refresh',
      label: '刷新列表',
      icon: 'refresh',
      divider: !options.extra?.length,
      onSelect: options.onRefresh,
    })
  }
  return items
}

/**
 * 生成可直接绑定到 `n-tree` 的 `node-props`。
 *
 * 用法：`<n-tree :node-props="treeNodeProps((node) => defaultTreeMenuItems(node))" />`
 * —— 页面只声明"这个节点的菜单是什么"，不需要关心事件绑定、坐标和面板。
 */
export function treeNodeProps(
  build: (node: TreeMenuNode) => ContextMenuItem[],
): (node: TreeMenuNode) => Record<string, unknown> {
  return (node) => ({
    onContextmenu: (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const items = build(node)
      if (!items.length) return
      openContextMenu({ x: event.clientX, y: event.clientY, items, opener: null })
    },
  })
}
