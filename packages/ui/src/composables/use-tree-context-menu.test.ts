/**
 * 树节点右键的通用项生成。
 *
 * 关注点：子树 key 收集必须覆盖所有层级（否则"复制整棵子树"会漏数据），
 * 以及没有子节点时不该出现该项。
 */
import { describe, expect, it } from 'vitest'
import { collectNodeKeys, defaultTreeMenuItems, nodeLabelText } from './use-tree-context-menu'

const tree = {
  key: 'root',
  label: '根节点',
  children: [
    { key: 'a', label: '子 A', children: [{ key: 'a1', label: '孙 A1' }] },
    { key: 'b', label: '子 B' },
  ],
}

describe('nodeLabelText', () => {
  it('字符串标签直接返回', () => {
    expect(nodeLabelText({ key: 'x', label: '权限点' })).toBe('权限点')
  })

  it('标签是渲染函数时退化为 key，保证可复制', () => {
    expect(nodeLabelText({ key: 'x', label: () => null })).toBe('x')
  })
})

describe('collectNodeKeys', () => {
  it('递归收集自身与所有后代 key', () => {
    expect(collectNodeKeys(tree)).toEqual(['root', 'a', 'a1', 'b'])
  })

  it('叶子节点只含自身', () => {
    expect(collectNodeKeys({ key: 'leaf' })).toEqual(['leaf'])
  })

  it('缺 key 的节点被跳过但不影响后代', () => {
    expect(collectNodeKeys({ children: [{ key: 'x' }] })).toEqual(['x'])
  })
})

describe('defaultTreeMenuItems', () => {
  it('默认提供复制名称与复制标识', () => {
    const keys = defaultTreeMenuItems({ key: 'k', label: '节点' }).map((item) => item.key)
    expect(keys).toContain('copy-label')
    expect(keys).toContain('copy-key')
  })

  it('有后代时提供"复制整棵子树"', () => {
    const keys = defaultTreeMenuItems(tree).map((item) => item.key)
    expect(keys).toContain('copy-subtree')
  })

  it('叶子节点不提供子树复制', () => {
    const keys = defaultTreeMenuItems({ key: 'leaf', label: '叶子' }).map((item) => item.key)
    expect(keys).not.toContain('copy-subtree')
  })

  it('业务项插在通用项之后、刷新之前', () => {
    const keys = defaultTreeMenuItems(
      { key: 'k', label: '节点' },
      {
        extra: [{ key: 'biz', label: '业务动作', onSelect: () => {} }],
        onRefresh: () => {},
      },
    ).map((item) => item.key)
    expect(keys.indexOf('biz')).toBeGreaterThan(keys.indexOf('copy-key'))
    expect(keys.indexOf('refresh')).toBeGreaterThan(keys.indexOf('biz'))
  })

  it('不传刷新回调时不出现刷新项', () => {
    const keys = defaultTreeMenuItems({ key: 'k' }).map((item) => item.key)
    expect(keys).not.toContain('refresh')
  })
})
