import { describe, expect, it } from 'vitest'
import {
  PERMISSION_GROUP_KEY_PREFIX,
  buildPermissionTree,
  collectPermissionIds,
  countPermissions,
  expandPermissionKeys,
  pickPermissionIds,
} from './permission-tree'
import type { PermissionView } from './types'

function perm(id: number, permCode: string, extra: Partial<PermissionView> = {}): PermissionView {
  return {
    id,
    permCode,
    resource: null,
    action: null,
    description: null,
    status: 1,
    createTime: null,
    updateTime: null,
    ...extra,
  }
}

describe('buildPermissionTree', () => {
  it('按 permCode 的冒号分段组装树', () => {
    const tree = buildPermissionTree([
      perm(1, 'auth:user:list'),
      perm(2, 'auth:user:write'),
      perm(3, 'file:upload'),
    ])
    expect(tree.map((node) => node.code)).toEqual(['auth', 'file'])

    const auth = tree[0]
    expect(auth.permission).toBeNull()
    expect(auth.children.map((node) => node.code)).toEqual(['auth:user'])

    const user = auth.children[0]
    expect(user.children.map((node) => node.permission?.id)).toEqual([1, 2])
    expect(user.children.map((node) => node.label)).toEqual(['list', 'write'])

    expect(tree[1].children.map((node) => node.permission?.id)).toEqual([3])
  })

  it('同一节点既是权限点又是分组时同时保留', () => {
    const tree = buildPermissionTree([perm(5, 'file'), perm(6, 'file:upload')])
    expect(tree).toHaveLength(1)
    expect(tree[0].permission?.id).toBe(5)
    expect(tree[0].children.map((node) => node.permission?.id)).toEqual([6])
  })

  it('分组 key 使用合成前缀，与权限 id 不冲突', () => {
    const tree = buildPermissionTree([perm(1, 'auth:user:list')])
    expect(tree[0].key).toBe(`${PERMISSION_GROUP_KEY_PREFIX}auth`)
    expect(tree[0].children[0].key).toBe(`${PERMISSION_GROUP_KEY_PREFIX}auth:user`)
    expect(tree[0].children[0].children[0].key).toBe(1)
  })
})

describe('countPermissions / collectPermissionIds', () => {
  const tree = buildPermissionTree([
    perm(1, 'auth:user:list'),
    perm(2, 'auth:user:write'),
    perm(3, 'file:upload'),
  ])

  it('统计子树内权限点数量', () => {
    expect(countPermissions(tree[0])).toBe(2)
    expect(countPermissions(tree[0].children[0])).toBe(2)
    expect(countPermissions(tree[0].children[0].children[0])).toBe(1)
  })

  it('收集全部权限 id', () => {
    expect(collectPermissionIds(tree).sort()).toEqual([1, 2, 3])
  })
})

describe('expandPermissionKeys / pickPermissionIds', () => {
  const tree = buildPermissionTree([
    perm(1, 'auth:user:list'),
    perm(2, 'auth:user:write'),
    perm(3, 'file:upload'),
  ])

  it('全选时包含全部分组 key', () => {
    const keys = expandPermissionKeys(tree, [1, 2, 3])
    expect(keys).toContain(`${PERMISSION_GROUP_KEY_PREFIX}auth`)
    expect(keys).toContain(`${PERMISSION_GROUP_KEY_PREFIX}auth:user`)
    expect(pickPermissionIds(keys).sort()).toEqual([1, 2, 3])
  })

  it('仅部分选中时不包含未完全覆盖的分组 key', () => {
    const keys = expandPermissionKeys(tree, [1])
    expect(keys).toEqual([1])
    expect(pickPermissionIds(keys)).toEqual([1])
  })

  it('pickPermissionIds 过滤分组 key，仅保留权限 id', () => {
    expect(pickPermissionIds([`${PERMISSION_GROUP_KEY_PREFIX}auth`, 2, 3])).toEqual([2, 3])
  })
})
