/**
 * 侧栏菜单「子菜单展开态」：跨刷新持久化。
 *
 * 折叠态（`use-sider-collapsed`）只描述整体收成图标条；这里管的是展开的图标条里
 * 哪些分组是打开的。两者互相独立，都要在刷新后保持。
 *
 * 语义约定（避免"我明明收起来了，刷新又弹开"）：
 * - 首次访问（无存储）→ 展开当前路由所在的分组链，页面一进来就能看到自己在哪；
 * - 有存储 → 严格按存储恢复，即使用户收起了当前路由所在的分组，也不强行拉开；
 * - 用户主动切换路由到某个分组内的页面 → 才展开该分组链（导航语义）。
 */
import { computed, ref } from 'vue'

const STORAGE_KEY = 'yuna.sider-expanded'

function dedupe(keys: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const key of keys) {
    if (typeof key !== 'string' || !key || seen.has(key)) continue
    seen.add(key)
    result.push(key)
  }
  return result
}

function load(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return dedupe(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    /* 隐私模式或内容损坏：当作没有存储，回到默认行为 */
    return null
  }
}

/** 模块级单例：同页所有消费方共享一份展开态 */
const stored = load()
const expandedState = ref<string[]>(stored ?? [])
/** 是否已有用户存储：决定首次进入是否要自动展开当前路由链 */
let hasUserPreference = stored !== null

function persist(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* 静默降级为内存态 */
  }
}

export function useSiderExpanded() {
  const expandedKeys = computed<string[]>({
    get: () => expandedState.value,
    set: (keys) => {
      const next = dedupe(keys)
      if (next.length === expandedState.value.length && next.every((key, index) => key === expandedState.value[index])) {
        return
      }
      expandedState.value = next
      hasUserPreference = true
      persist(next)
    },
  })

  /** 展开全部给定分组 */
  function expandAll(keys: string[]): void {
    expandedKeys.value = [...expandedState.value, ...keys]
  }

  /** 收起全部分组 */
  function collapseAll(): void {
    expandedKeys.value = []
  }

  /**
   * 保证给定分组链处于展开态（只增不减，不动用户已展开的其他分组）。
   * 仅在导航或首次进入时调用，避免与用户的主动收起打架。
   */
  function ensureExpanded(keys: string[]): void {
    const missing = keys.filter((key) => !expandedState.value.includes(key))
    if (missing.length === 0) return
    expandedKeys.value = [...expandedState.value, ...missing]
  }

  /** 清掉菜单里已不存在的陈旧 key（菜单配置变动后不留下无效展开项） */
  function prune(availableKeys: string[]): void {
    const allowed = new Set(availableKeys)
    const next = expandedState.value.filter((key) => allowed.has(key))
    if (next.length === expandedState.value.length) return
    expandedKeys.value = next
  }

  return {
    expandedKeys,
    expandAll,
    collapseAll,
    ensureExpanded,
    prune,
    /** 首次进入且用户没有历史偏好时需要展开当前路由链 */
    needsInitialExpand: () => !hasUserPreference,
    /** 供测试使用：重置模块级单例 */
    __reset: (keys: string[] | null = null) => {
      expandedState.value = keys ?? []
      hasUserPreference = keys !== null
    },
  }
}
