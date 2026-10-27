/**
 * 内容页签的状态语义。
 *
 * 这些规则一旦松动，用户立刻会感知（页签乱跳、关不掉、刷新后全丢），
 * 所以逐条钉死：顺序固定、固定页签受保护、关闭后激活右侧邻居。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useContentTabs } from './use-content-tabs'

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

const KEY = 'yuna.content-tabs'

describe('useContentTabs', () => {
  beforeEach(() => {
    storage.clear()
    useContentTabs().__reset()
  })

  it('打开顺序即页签顺序，不做最近使用置顶', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.open({ key: '/c', label: 'C' })
    api.activate('/a')
    expect(api.tabs.value.map((tab) => tab.key)).toEqual(['/a', '/b', '/c'])
    expect(api.activeKey.value).toBe('/a')
  })

  it('重复打开同一页签只激活，不新增也不改顺序', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.open({ key: '/a', label: 'A' })
    expect(api.tabs.value.map((tab) => tab.key)).toEqual(['/a', '/b'])
    expect(api.activeKey.value).toBe('/a')
  })

  it('菜单改名后页签文案跟随更新', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: '旧名字' })
    api.open({ key: '/a', label: '新名字' })
    expect(api.tabs.value[0].label).toBe('新名字')
  })

  it('关闭当前页签后激活右侧邻居', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.open({ key: '/c', label: 'C' })
    api.activate('/b')
    expect(api.close('/b')).toBe('/c')
    expect(api.activeKey.value).toBe('/c')
  })

  it('关闭最右侧当前页签后激活左侧邻居', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    expect(api.close('/b')).toBe('/a')
  })

  it('关闭非当前页签不改变激活项', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.activate('/b')
    expect(api.close('/a')).toBe(null)
    expect(api.activeKey.value).toBe('/b')
  })

  it('最后一个页签关不掉', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    expect(api.close('/a')).toBe(null)
    expect(api.tabs.value.length).toBe(1)
  })

  it('固定页签不可关闭', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.togglePin('/a')
    expect(api.close('/a')).toBe(null)
    expect(api.tabs.value.length).toBe(2)
  })

  it('固定页签跨刷新保留（落盘）', () => {
    const api = useContentTabs()
    api.open({ key: '/home', label: '首页' })
    api.togglePin('/home')
    const persisted = JSON.parse(storage.getItem(KEY) as string)
    expect(persisted.pinned).toEqual([{ key: '/home', label: '首页' }])
  })

  it('关闭其他时保留固定页签', () => {
    const api = useContentTabs()
    api.open({ key: '/home', label: '首页' })
    api.togglePin('/home')
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.closeOthers('/b')
    expect(api.tabs.value.map((tab) => tab.key)).toEqual(['/home', '/b'])
    expect(api.activeKey.value).toBe('/b')
  })

  it('关闭右侧时保留固定页签', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    api.open({ key: '/pinned', label: '固定' })
    api.togglePin('/pinned')
    api.open({ key: '/c', label: 'C' })
    api.closeRight('/a')
    expect(api.tabs.value.map((tab) => tab.key)).toEqual(['/a', '/pinned'])
  })

  it('关闭全部后只剩固定页签', () => {
    const api = useContentTabs()
    api.open({ key: '/home', label: '首页' })
    api.togglePin('/home')
    api.open({ key: '/a', label: 'A' })
    api.open({ key: '/b', label: 'B' })
    expect(api.closeAll()).toBe('/home')
    expect(api.tabs.value.map((tab) => tab.key)).toEqual(['/home'])
  })

  it('菜单项禁用态判据与实际可关闭性一致', () => {
    const api = useContentTabs()
    api.open({ key: '/a', label: 'A' })
    expect(api.hasClosableOthers('/a')).toBe(false)
    expect(api.hasClosableRight('/a')).toBe(false)
    api.open({ key: '/b', label: 'B' })
    expect(api.hasClosableOthers('/a')).toBe(true)
    expect(api.hasClosableRight('/a')).toBe(true)
    api.togglePin('/b')
    expect(api.hasClosableRight('/a')).toBe(false)
  })

  it('存储损坏时不抛错，按空状态启动', () => {
    storage.setItem(KEY, '{{坏掉的 JSON')
    const api = useContentTabs()
    api.__reset()
    expect(api.tabs.value).toEqual([])
  })
})
