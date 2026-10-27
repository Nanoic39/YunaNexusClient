/**
 * 内容标签页：多页签导航的唯一状态源。
 *
 * 语义（刻意写死，避免各处"顺手"改出不一致）：
 * 1. **顺序 = 首次打开顺序**。不做"最近使用置顶"，页签位置一旦出现就不许自己乱动，
 *    否则用户肌肉记忆会失效（这是企业后台里被吐槽最多的细节之一）。
 * 2. **固定页签**（pin）不可关闭、不可被"关闭其他/关闭右侧"带走，并且跨刷新保留。
 * 3. **至少保留一个页签**：关掉最后一个时保留它本身，避免出现"空白壳"。
 * 4. 关闭当前页签后优先激活右侧邻居，其次左侧，符合"从哪来回哪去"的直觉。
 */
import { computed, ref } from 'vue'

export interface ContentTab {
  /** 路由 key（通常是 path） */
  key: string
  label: string
  /** 固定页签：不可关闭、不随批量关闭消失、跨刷新保留 */
  pinned: boolean
  /** 不可关闭（如首页） */
  closable: boolean
}

const STORAGE_KEY = 'yuna.content-tabs'

interface PersistedState {
  pinned: Array<{ key: string; label: string }>
}

function readStorage(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pinned: [] }
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    const pinned = Array.isArray(parsed?.pinned)
      ? parsed.pinned.filter(
          (item): item is { key: string; label: string } =>
            typeof item?.key === 'string' && typeof item?.label === 'string',
        )
      : []
    return { pinned }
  } catch {
    // 存储损坏按"没有存储"处理，绝不因为脏数据白屏
    return { pinned: [] }
  }
}

function writeStorage(tabs: ContentTab[]): void {
  try {
    const pinned = tabs.filter((tab) => tab.pinned).map(({ key, label }) => ({ key, label }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pinned }))
  } catch {
    // 隐私模式/配额满时静默降级：功能仍可用，只是不跨刷新
  }
}

const tabs = ref<ContentTab[]>(
  readStorage().pinned.map((item) => ({ key: item.key, label: item.label, pinned: true, closable: true })),
)
const activeKey = ref<string | null>(tabs.value[0]?.key ?? null)

function persist(): void {
  writeStorage(tabs.value)
}

function indexOf(key: string): number {
  return tabs.value.findIndex((tab) => tab.key === key)
}

/** 打开（或激活）一个页签；已存在时不改变顺序 */
function open(tab: { key: string; label: string; closable?: boolean }): void {
  if (!tab.key) return
  const existing = indexOf(tab.key)
  if (existing >= 0) {
    // 标签可能因为菜单改名而变化，跟随更新；固定态与顺序不动
    if (tabs.value[existing].label !== tab.label) tabs.value[existing].label = tab.label
    activeKey.value = tab.key
    return
  }
  tabs.value.push({
    key: tab.key,
    label: tab.label,
    pinned: false,
    closable: tab.closable ?? true,
  })
  activeKey.value = tab.key
}

function activate(key: string): void {
  if (indexOf(key) >= 0) activeKey.value = key
}

/** 关闭指定页签，返回关闭后应当激活的 key（无变化时返回 null） */
function close(key: string): string | null {
  const index = indexOf(key)
  if (index < 0) return null
  const tab = tabs.value[index]
  if (tab.pinned || !tab.closable) return null
  if (tabs.value.length <= 1) return null
  const wasActive = activeKey.value === key
  tabs.value.splice(index, 1)
  const next = tabs.value[index] ?? tabs.value[index - 1] ?? null
  if (wasActive) activeKey.value = next?.key ?? null
  return wasActive ? next?.key ?? null : null
}

/** 关闭除 key 之外的所有可关闭页签 */
function closeOthers(key: string): string | null {
  const kept = tabs.value.filter((tab) => tab.key === key || tab.pinned || !tab.closable)
  if (kept.length === tabs.value.length) return null
  tabs.value = kept
  activeKey.value = key
  persist()
  return key
}

/** 关闭 key 右侧的所有可关闭页签 */
function closeRight(key: string): string | null {
  const index = indexOf(key)
  if (index < 0) return null
  const kept = tabs.value.filter((tab, position) => position <= index || tab.pinned || !tab.closable)
  if (kept.length === tabs.value.length) return null
  const activeRemoved = activeKey.value !== null && indexOf(activeKey.value) > index
  tabs.value = kept
  if (activeRemoved) activeKey.value = key
  persist()
  return activeRemoved ? key : null
}

/** 关闭全部可关闭页签（固定页签保留），返回新的激活 key */
function closeAll(): string | null {
  const kept = tabs.value.filter((tab) => tab.pinned || !tab.closable)
  const current = activeKey.value
  tabs.value = kept
  const next = kept.some((tab) => tab.key === current) ? current : kept[0]?.key ?? null
  activeKey.value = next
  persist()
  return next
}

/** 固定/取消固定：固定页签跨刷新保留 */
function togglePin(key: string): void {
  const tab = tabs.value.find((item) => item.key === key)
  if (!tab) return
  tab.pinned = !tab.pinned
  persist()
}

/** 是否还有可关闭页签（用于禁用菜单项） */
const closableCount = computed(
  () => tabs.value.filter((tab) => tab.closable && !tab.pinned).length,
)

function hasClosableRight(key: string): boolean {
  const index = indexOf(key)
  if (index < 0) return false
  return tabs.value.slice(index + 1).some((tab) => tab.closable && !tab.pinned)
}

function hasClosableOthers(key: string): boolean {
  return tabs.value.some((tab) => tab.key !== key && tab.closable && !tab.pinned)
}

/** 测试与"退出登录"场景使用：清空全部页签 */
function reset(tab?: { key: string; label: string }): void {
  tabs.value = tab ? [{ key: tab.key, label: tab.label, pinned: false, closable: true }] : []
  activeKey.value = tab?.key ?? null
  persist()
}

export function useContentTabs() {
  return {
    tabs,
    activeKey,
    closableCount,
    open,
    activate,
    close,
    closeOthers,
    closeRight,
    closeAll,
    togglePin,
    hasClosableRight,
    hasClosableOthers,
    persist,
    __reset: reset,
  }
}

/** 只读快照，供非组件模块判断（如退出登录时清页签） */
export const contentTabsState = { tabs, activeKey }
