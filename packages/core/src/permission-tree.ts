/**
 * 权限树组装工具。
 *
 * 后端 `GET /permission/admin/permissions` 返回扁平列表（无父子字段），管理端按
 * `permCode` 的 `:` 分段（如 `auth:user:list` → auth / user / list）组装为树，
 * 用于「权限管理」页树形展示与「角色管理」绑定弹窗的级联勾选。
 */
import type { PermissionView } from './types'

/** 权限树节点：按前缀聚合的分组节点，或具体权限点叶子节点 */
export interface PermissionTreeNode {
  /** 叶子为权限 id；分组为合成 key（`__perm__:<前缀>`），不会与权限 id 冲突 */
  key: string | number
  /** 展示名：分组为所属分段，叶子为 permCode 末段 */
  label: string
  /** 完整前缀（分组）或权限标识（叶子） */
  code: string
  /** 叶子对应的权限记录；分组节点为 null */
  permission: PermissionView | null
  children: PermissionTreeNode[]
}

/** 分组节点 key 前缀，便于与数字权限 id 区分 */
export const PERMISSION_GROUP_KEY_PREFIX = '__perm__:'

interface MutableNode {
  segment: string
  code: string
  permission: PermissionView | null
  children: Map<string, MutableNode>
}

function splitCode(permCode: string): string[] {
  return permCode
    .split(':')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function toTreeNodes(level: Map<string, MutableNode>): PermissionTreeNode[] {
  return [...level.values()]
    .sort((a, b) => a.segment.localeCompare(b.segment))
    .map((node) => ({
      key: node.permission ? node.permission.id : `${PERMISSION_GROUP_KEY_PREFIX}${node.code}`,
      label: node.segment,
      code: node.code,
      permission: node.permission,
      children: toTreeNodes(node.children),
    }))
}

/** 将扁平权限列表按 `permCode` 前缀组装为树（同层按分段字典序排序） */
export function buildPermissionTree(permissions: PermissionView[]): PermissionTreeNode[] {
  const roots = new Map<string, MutableNode>()
  const sorted = [...permissions].sort((a, b) => a.permCode.localeCompare(b.permCode))
  for (const permission of sorted) {
    const segments = splitCode(permission.permCode)
    if (!segments.length) continue
    let level = roots
    let target: MutableNode | null = null
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      let node = level.get(segment)
      if (!node) {
        node = {
          segment,
          code: segments.slice(0, index + 1).join(':'),
          permission: null,
          children: new Map(),
        }
        level.set(segment, node)
      }
      target = node
      level = node.children
    }
    if (target) target.permission = permission
  }
  return toTreeNodes(roots)
}

/** 统计节点（含自身，若为权限点）子树内的权限点数量 */
export function countPermissions(node: PermissionTreeNode): number {
  return (
    (node.permission ? 1 : 0) +
    node.children.reduce((sum, child) => sum + countPermissions(child), 0)
  )
}

/** 收集树中全部权限点 id */
export function collectPermissionIds(nodes: PermissionTreeNode[]): number[] {
  return nodes.flatMap((node) => [
    ...(node.permission ? [node.permission.id] : []),
    ...collectPermissionIds(node.children),
  ])
}

/**
 * 将已绑定的权限 id 展开为树中应勾选的完整 key 集合。
 *
 * 分组节点在其下全部权限点均被选中时一并计入，保证级联勾选状态正确回显。
 */
export function expandPermissionKeys(
  nodes: PermissionTreeNode[],
  ids: number[],
): Array<string | number> {
  const selected = new Set(ids)
  const keys: Array<string | number> = []
  const visit = (node: PermissionTreeNode): boolean => {
    const selfChecked = node.permission ? selected.has(node.permission.id) : true
    if (node.permission && selfChecked) keys.push(node.key)
    const childrenChecked = node.children.map(visit)
    const allChildrenChecked = node.children.length > 0 && childrenChecked.every(Boolean)
    if (node.children.length > 0 && selfChecked && allChildrenChecked) keys.push(node.key)
    return selfChecked && (node.children.length === 0 || allChildrenChecked)
  }
  nodes.forEach(visit)
  return keys
}

/** 从树的勾选 key 集合中提取权限点 id（忽略分组 key） */
export function pickPermissionIds(keys: Array<string | number>): number[] {
  return keys.filter((key): key is number => typeof key === 'number')
}
