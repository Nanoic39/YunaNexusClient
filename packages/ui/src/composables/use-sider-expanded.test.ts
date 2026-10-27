/**
 * 侧栏展开态持久化：语义约定了就要锁住，否则"刷新后菜单又自己弹开"这类问题会回归。
 *
 * 测试环境是 node，没有 localStorage，这里注入一个内存实现，顺便覆盖"存储损坏"分支。
 * 模块级单例用 `__reset` 在每个用例前清空，避免用例互相污染。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useSiderExpanded } from './use-sider-expanded'

const store = new Map<string, string>()

class MemoryStorage implements Storage {
  get length(): number {
    return store.size
  }
  clear(): void {
    store.clear()
  }
  getItem(key: string): string | null {
    return store.has(key) ? (store.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    store.delete(key)
  }
  setItem(key: string, value: string): void {
    store.set(key, value)
  }
}

;(globalThis as unknown as { localStorage: Storage }).localStorage ??= new MemoryStorage()
/** 断言统一走同一个 Storage 实例：多个测试文件在同一进程里共享它 */
const storage = (globalThis as unknown as { localStorage: Storage }).localStorage

const KEY = 'yuna.sider-expanded'

describe('useSiderExpanded', () => {
  beforeEach(() => {
    storage.clear()
    useSiderExpanded().__reset(null)
  })

  it('没有存储时从空开始，并提示需要首次展开当前路由链', () => {
    const { expandedKeys, needsInitialExpand } = useSiderExpanded()
    expect(expandedKeys.value).toEqual([])
    expect(needsInitialExpand()).toBe(true)
  })

  it('写入后落盘', () => {
    const api = useSiderExpanded()
    api.expandedKeys.value = ['/system', '/system/user']
    expect(JSON.parse(storage.getItem(KEY) as string)).toEqual(['/system', '/system/user'])
    expect(api.needsInitialExpand()).toBe(false)
  })

  it('从已有存储恢复（含首次标记）', () => {
    storage.setItem(KEY, JSON.stringify(['/system']))
    const api = useSiderExpanded()
    api.__reset(['/system'])
    expect(api.expandedKeys.value).toEqual(['/system'])
    expect(api.needsInitialExpand()).toBe(false)
  })

  it('ensureExpanded 只增不减，不会把用户手动收起的其他分组又拉开', () => {
    const api = useSiderExpanded()
    api.expandedKeys.value = ['/a']
    api.ensureExpanded(['/b'])
    expect(api.expandedKeys.value).toEqual(['/a', '/b'])
  })

  it('ensureExpanded 对已存在的分组不重复追加', () => {
    const api = useSiderExpanded()
    api.expandedKeys.value = ['/a']
    api.ensureExpanded(['/a', '/a'])
    expect(api.expandedKeys.value).toEqual(['/a'])
  })

  it('collapseAll 清空并落盘为空数组', () => {
    const api = useSiderExpanded()
    api.expandAll(['/a', '/b'])
    api.collapseAll()
    expect(api.expandedKeys.value).toEqual([])
    expect(storage.getItem(KEY)).toBe('[]')
  })

  it('prune 清掉菜单里已不存在的分组', () => {
    const api = useSiderExpanded()
    api.expandedKeys.value = ['/a', '/gone', '/b']
    api.prune(['/a', '/b', '/c'])
    expect(api.expandedKeys.value).toEqual(['/a', '/b'])
  })

  it('重复 key 会被去重', () => {
    const api = useSiderExpanded()
    api.expandedKeys.value = ['/a', '/a', '/b', '/a']
    expect(api.expandedKeys.value).toEqual(['/a', '/b'])
  })

  it('存储内容损坏时按"没有存储"处理，不抛错', () => {
    storage.setItem(KEY, '{不是 JSON')
    const api = useSiderExpanded()
    api.__reset(null)
    expect(api.expandedKeys.value).toEqual([])
    expect(api.needsInitialExpand()).toBe(true)
  })

  it('存储里混入非字符串项时被过滤', () => {
    storage.setItem(KEY, JSON.stringify(['/a', 42, null, '/b']))
    const api = useSiderExpanded()
    api.__reset(['/a', '/b'])
    expect(api.expandedKeys.value).toEqual(['/a', '/b'])
  })
})
