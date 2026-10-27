/**
 * 全局右键菜单：状态、按区域注册的菜单提供者、以及默认菜单。
 *
 * 设计要点：
 * - **一处接管、按区域给内容**：`ContextMenu` 在 document 上监听 contextmenu，
 *   通过 `resolveContextMenuItems` 依次询问：元素声明的 `v-context-menu` 指令 →
 *   按 `kind` 注册的区域提供者 → 可编辑区编辑菜单 → 通用菜单。
 * - 提供者是纯函数 `(context) => items`，可读组件状态（是否选中、是否禁用），
 *   因此"同一区域不同状态给不同菜单"是一等公民，而不是散落在各页面里的 if。
 * - 图标可用内置名或任意组件：内置名让业务包不必重复引入图标库。
 */
import { computed, reactive, type Component } from 'vue'

/** 内置图标名（ContextMenu 内部渲染为统一线宽 SVG） */
export type ContextMenuIcon =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'refresh'
  | 'auto'
  | 'light'
  | 'dark'
  | 'download'
  | 'share'
  | 'link'
  | 'rename'
  | 'delete'
  | 'info'
  | 'openTab'
  | 'external'
  | 'collapse'
  | 'expand'
  | 'export'

export type ContextMenuAction = () => void | Promise<void>

export interface ContextMenuItem {
  /** 唯一键，用于渲染、键盘导航与去重 */
  key: string
  label?: string
  /** 内置图标名或任意图标组件 */
  icon?: ContextMenuIcon | Component
  /** 右侧展示的快捷键提示（纯展示，不做按键绑定） */
  shortcut?: string
  disabled?: boolean
  /** 右侧勾选态，用于"当前项"语义（主题模式、排序方式等） */
  checked?: boolean
  danger?: boolean
  /** 在该项上方画分隔线 */
  divider?: boolean
  /** 子菜单：存在时该项变为可展开项，onSelect 不再触发 */
  children?: ContextMenuItem[]
  /** 分组标题：不可点击，仅作分区说明 */
  header?: boolean
  onSelect?: ContextMenuAction
}

/** 右键时携带的上下文：区域名、业务负载、命中元素与原始事件 */
export interface ContextMenuContext<T = unknown> {
  kind: string
  payload: T
  event: MouseEvent
  target: Element
}

export type ContextMenuProvider = (context: ContextMenuContext) => ContextMenuItem[] | null

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  /** 打开菜单时的焦点元素，关闭后归还焦点 */
  opener: HTMLElement | null
}

const state = reactive<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  opener: null,
})

/** 区域提供者注册表：kind → provider */
const providers = new Map<string, ContextMenuProvider>()

export function registerContextMenuProvider(kind: string, provider: ContextMenuProvider): () => void {
  providers.set(kind, provider)
  return () => {
    if (providers.get(kind) === provider) providers.delete(kind)
  }
}

export function contextMenuProvider(kind: string): ContextMenuProvider | undefined {
  return providers.get(kind)
}

export function openContextMenu(options: {
  x: number
  y: number
  items: ContextMenuItem[]
  opener?: HTMLElement | null
}): void {
  if (!options.items.length) return
  state.x = options.x
  state.y = options.y
  state.items = options.items
  state.opener = options.opener ?? (document.activeElement as HTMLElement | null)
  state.visible = true
}

export function closeContextMenu(): void {
  if (!state.visible) return
  state.visible = false
  state.items = []
  const opener = state.opener
  state.opener = null
  // 键盘打开时把焦点还回去；鼠标打开时 document.activeElement 通常就是原处，不抢焦点
  if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
}

export function useContextMenu(): {
  state: ContextMenuState
  openContextMenu: typeof openContextMenu
  closeContextMenu: typeof closeContextMenu
} {
  return { state, openContextMenu, closeContextMenu }
}

/** 判断元素是否可接收文本输入 */
function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  return el instanceof HTMLElement && el.isContentEditable
}

export function resolveEditable(source: EventTarget | null): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const fromSource =
    source instanceof Element
      ? source.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
      : null
  if (fromSource instanceof HTMLElement) return fromSource
  const active = document.activeElement
  return isEditable(active) ? active : null
}

/** 读取当前选中文本，兼容原生 input / textarea（其选区不属于 window.getSelection） */
export function readSelectedText(source: EventTarget | null): string {
  const editable = resolveEditable(source)
  if (editable && (editable.tagName === 'INPUT' || editable.tagName === 'TEXTAREA')) {
    const field = editable as HTMLInputElement | HTMLTextAreaElement
    const start = field.selectionStart ?? 0
    const end = field.selectionEnd ?? 0
    if (end > start) return field.value.slice(start, end)
  }
  if (typeof window === 'undefined') return ''
  return window.getSelection()?.toString() ?? ''
}

function writeClipboard(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => {})
}

/** 可编辑区域的完整菜单：剪切 / 复制 / 粘贴 / 全选 / 清空 */
export function createEditableContextMenuItems(source: EventTarget | null): ContextMenuItem[] {
  const editable = resolveEditable(source)
  const field = editable as HTMLInputElement | HTMLTextAreaElement | null
  const selected = readSelectedText(source)
  const hasSelection = selected.length > 0
  const canPaste = Boolean(editable) && Boolean(navigator.clipboard)

  function insert(text: string): void {
    if (!editable) return
    editable.focus({ preventScroll: true })
    if (field && typeof field.selectionStart === 'number' && text) {
      const start = field.selectionStart
      const end = field.selectionEnd ?? start
      field.setRangeText(text, start, end, 'end')
      field.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }
    if (text) document.execCommand('insertText', false, text)
  }

  return [
    {
      key: 'cut',
      label: '剪切',
      icon: 'cut',
      shortcut: 'Ctrl+X',
      disabled: !hasSelection,
      onSelect: () => {
        if (!editable) return
        writeClipboard(selected)
        insert('')
      },
    },
    {
      key: 'copy',
      label: '复制',
      icon: 'copy',
      shortcut: 'Ctrl+C',
      disabled: !hasSelection,
      onSelect: () => writeClipboard(selected),
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: 'paste',
      shortcut: 'Ctrl+V',
      disabled: !canPaste,
      onSelect: () => {
        void navigator.clipboard
          ?.readText()
          .then((text) => insert(text))
          .catch(() => {})
      },
    },
    {
      key: 'select-all',
      label: '全选',
      icon: 'selectAll',
      shortcut: 'Ctrl+A',
      divider: true,
      onSelect: () => {
        if (!editable) return
        editable.focus({ preventScroll: true })
        if (field && typeof field.setSelectionRange === 'function') {
          field.setSelectionRange(0, field.value.length)
        } else {
          document.execCommand('selectAll')
        }
      },
    },
    {
      key: 'clear',
      label: '清空',
      icon: 'delete',
      danger: true,
      onSelect: () => {
        if (!editable) return
        if (field) {
          field.focus({ preventScroll: true })
          field.setSelectionRange(0, field.value.length)
          field.setRangeText('', 0, field.value.length, 'end')
          field.dispatchEvent(new Event('input', { bubbles: true }))
        } else {
          editable.textContent = ''
        }
      },
    },
  ]
}

/** 通用菜单：复制选中文本 / 全选页面文本 / 回到顶部 / 刷新 */
export function createDefaultContextMenuItems(source: EventTarget | null = null): ContextMenuItem[] {
  const selected = readSelectedText(source)
  const scroller =
    typeof document === 'undefined' ? null : document.scrollingElement ?? document.documentElement
  return [
    {
      key: 'copy',
      label: '复制',
      icon: 'copy',
      shortcut: 'Ctrl+C',
      disabled: !selected,
      onSelect: () => writeClipboard(selected),
    },
    {
      key: 'select-all',
      label: '全选页面文本',
      icon: 'selectAll',
      shortcut: 'Ctrl+A',
      onSelect: () => {
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.selectAllChildren(document.body)
      },
    },
    {
      key: 'back-to-top',
      label: '回到顶部',
      icon: 'expand',
      divider: true,
      disabled: !scroller || scroller.scrollTop <= 0,
      onSelect: () => {
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    },
    {
      key: 'refresh',
      label: '刷新页面',
      icon: 'refresh',
      shortcut: 'F5',
      onSelect: () => {
        if (typeof window !== 'undefined') window.location.reload()
      },
    },
  ]
}

/**
 * 解决一次右键应该显示什么菜单。
 *
 * 顺序：区域提供者 → 可编辑区编辑菜单 → 通用菜单。
 * 提供者返回空数组视为"此处不自定义"，继续回退，避免误吞右键。
 */
export function resolveContextMenuItems(context: ContextMenuContext): ContextMenuItem[] {
  const provider = providers.get(context.kind)
  if (provider) {
    const custom = provider(context)
    if (custom && custom.length) return custom
  }
  if (resolveEditable(context.target)) return createEditableContextMenuItems(context.target)
  return createDefaultContextMenuItems(context.target)
}

/* ------------------------------------------------------------------ 键盘导航 */

/**
 * 在列表内移动高亮位置，返回下一项下标（-1 表示没有可选项）。
 *
 * 只返回**原数组**下标：分组标题与 disabled 项都跳过，且不能因为跳过了元素就把
 * 后续元素的下标前移，否则高亮会落到错误的那一行。
 */
export function moveActive(items: ContextMenuItem[], current: number, delta: 1 | -1): number {
  const order: number[] = []
  items.forEach((item, index) => {
    if (!item.header && !item.disabled) order.push(index)
  })
  if (!order.length) return -1
  const position = order.indexOf(current)
  if (position === -1) return delta === 1 ? order[0] : order[order.length - 1]
  return order[(position + delta + order.length) % order.length]
}

/** 当前是否有可用菜单项（全 disabled 时也允许打开，只是都点不了） */
export function hasMenuItems(items: ContextMenuItem[]): boolean {
  return items.length > 0
}

/** 响应式可见性判断 */
export function useContextMenuVisible() {
  return computed(() => state.visible)
}

/** 测试用：重置注册表与状态 */
export function __resetContextMenu(): void {
  providers.clear()
  state.visible = false
  state.items = []
  state.opener = null
}

/** 组件内部读取用的状态单例 */
export const contextMenuState = state
