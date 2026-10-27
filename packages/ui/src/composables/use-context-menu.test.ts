/**
 * 右键菜单的纯逻辑：键盘游标、区域解析顺序、注册表生命周期。
 *
 * 这些是"菜单好不好用"的根因所在（跳过 disabled、循环、注册顺序），
 * 放在纯函数层面测试，不依赖 DOM。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetContextMenu,
  contextMenuProvider,
  hasMenuItems,
  moveActive,
  registerContextMenuProvider,
  resolveContextMenuItems,
  type ContextMenuItem,
} from './use-context-menu'

function items(...specs: Array<[string, boolean?]>): ContextMenuItem[] {
  return specs.map(([key, disabled]) => ({ key, label: key, disabled, onSelect: () => {} }))
}

describe('moveActive', () => {
  it('从无选中状态向下移动落到第一项', () => {
    expect(moveActive(items(['a'], ['b']), -1, 1)).toBe(0)
  })

  it('从无选中状态向上移动落到最后一项', () => {
    expect(moveActive(items(['a'], ['b']), -1, -1)).toBe(1)
  })

  it('跳过 disabled 项', () => {
    expect(moveActive(items(['a'], ['b', true], ['c']), 0, 1)).toBe(2)
  })

  it('末尾继续向下回到开头', () => {
    expect(moveActive(items(['a'], ['b']), 1, 1)).toBe(0)
  })

  it('开头继续向上回到末尾', () => {
    expect(moveActive(items(['a'], ['b']), 0, -1)).toBe(1)
  })

  it('全部 disabled 时返回 -1', () => {
    expect(moveActive(items(['a', true], ['b', true]), -1, 1)).toBe(-1)
  })

  it('空列表返回 -1', () => {
    expect(moveActive([], -1, 1)).toBe(-1)
  })

  it('分组标题不参与高亮', () => {
    const list: ContextMenuItem[] = [
      { key: 'h', label: '分组', header: true },
      { key: 'a', label: 'a', onSelect: () => {} },
    ]
    expect(moveActive(list, -1, 1)).toBe(1)
  })
})

describe('hasMenuItems', () => {
  it('空数组视为没有菜单', () => {
    expect(hasMenuItems([])).toBe(false)
  })

  it('有项即为有菜单', () => {
    expect(hasMenuItems(items(['a']))).toBe(true)
  })
})

describe('区域提供者注册表', () => {
  beforeEach(() => {
    __resetContextMenu()
  })

  it('注册后能按 kind 取回', () => {
    const provider = () => items(['x'])
    registerContextMenuProvider('table-row', provider)
    expect(contextMenuProvider('table-row')).toBe(provider)
  })

  it('注销后不再命中', () => {
    const dispose = registerContextMenuProvider('table-row', () => items(['x']))
    dispose()
    expect(contextMenuProvider('table-row')).toBeUndefined()
  })

  it('重复注册同一 kind 只保留最后一个，旧注销函数不会误删新提供者', () => {
    const disposeFirst = registerContextMenuProvider('file', () => items(['first']))
    const second = () => items(['second'])
    registerContextMenuProvider('file', second)
    disposeFirst()
    expect(contextMenuProvider('file')).toBe(second)
  })
})

describe('resolveContextMenuItems', () => {
  beforeEach(() => {
    __resetContextMenu()
  })

  it('提供者返回的项优先于兜底菜单', () => {
    registerContextMenuProvider('table-row', () => items(['custom']))
    const resolved = resolveContextMenuItems({
      kind: 'table-row',
      payload: null,
      event: { clientX: 0, clientY: 0 } as unknown as MouseEvent,
      target: { tagName: 'DIV', closest: () => null } as unknown as Element,
    })
    expect(resolved.map((item) => item.key)).toContain('custom')
  })

  it('提供者返回空数组表示"不自定义"，回退到兜底菜单', () => {
    registerContextMenuProvider('table-row', () => [])
    const resolved = resolveContextMenuItems({
      kind: 'table-row',
      payload: null,
      event: { clientX: 0, clientY: 0 } as unknown as MouseEvent,
      target: { tagName: 'DIV', closest: () => null } as unknown as Element,
    })
    expect(resolved.length).toBeGreaterThan(0)
    expect(resolved.map((item) => item.key)).not.toContain('custom')
  })
})
