/**
 * 全局右键菜单：单一实例的轻量状态 + 打开/关闭。
 *
 * 设计要点：
 * - 平台「接管」浏览器右键 —— `ContextMenu` 组件在 document 上监听 contextmenu，
 *   未被组件自行处理（未 preventDefault）的右键一律弹出默认菜单（复制 / 粘贴 / 刷新）。
 * - 需要特别设定的组件（如主题切换、通知、头像）在自身 `@contextmenu.prevent` 里
 *   调用 `openContextMenu` 传入自定义 items，或直接 preventDefault 以完全屏蔽默认菜单。
 * - 所有菜单共用 `ContextMenu` 组件渲染，从而统一为半透明磨砂风格。
 */
import { reactive } from 'vue'

/** 菜单项内置图标名（对应 ContextMenu 内的 SVG 集合） */
export type ContextMenuIcon = 'copy' | 'paste' | 'refresh' | 'auto' | 'light' | 'dark'

export interface ContextMenuItem {
  /** 唯一键，用于 v-for 与键盘导航 */
  key: string
  label: string
  icon?: ContextMenuIcon
  /** 置灰不可点 */
  disabled?: boolean
  /** 右侧显示勾选（用于「当前项」语义，如主题模式） */
  checked?: boolean
  /** 危险操作（红色文字） */
  danger?: boolean
  /** 在该项上方绘制分隔线 */
  divider?: boolean
  onSelect: () => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  items: ContextMenuItem[]
}

const state = reactive<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: [],
})

export function openContextMenu(options: { x: number; y: number; items: ContextMenuItem[] }): void {
  state.x = options.x
  state.y = options.y
  state.items = options.items
  state.visible = true
}

export function closeContextMenu(): void {
  state.visible = false
}

export function useContextMenu(): { state: ContextMenuState; openContextMenu: typeof openContextMenu; closeContextMenu: typeof closeContextMenu } {
  return { state, openContextMenu, closeContextMenu }
}

/** 判断元素是否可接收文本输入 */
function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  return el instanceof HTMLElement && el.isContentEditable
}

/** 从右键目标向上寻找可编辑元素，找不到则回退到当前聚焦的可编辑元素 */
function resolveEditable(source: EventTarget | null): HTMLElement | null {
  const fromSource =
    source instanceof Element
      ? source.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
      : null
  if (fromSource instanceof HTMLElement) return fromSource
  const active = document.activeElement
  return isEditable(active) ? active : null
}

/** 读取当前选中文本，兼容原生 input / textarea（其选区不属于 window.getSelection） */
function readSelectedText(source: EventTarget | null): string {
  const editable = resolveEditable(source)
  if (editable && (editable.tagName === 'INPUT' || editable.tagName === 'TEXTAREA')) {
    const field = editable as HTMLInputElement | HTMLTextAreaElement
    const start = field.selectionStart ?? 0
    const end = field.selectionEnd ?? 0
    if (end > start) return field.value.slice(start, end)
  }
  return window.getSelection()?.toString() ?? ''
}

/**
 * 默认右键菜单项：复制 / 粘贴 / 刷新。
 * `source` 为右键命中的元素，用于判定复制来源与粘贴目标。
 */
export function createDefaultContextMenuItems(source: EventTarget | null = null): ContextMenuItem[] {
  const selectedText = readSelectedText(source)
  const editable = resolveEditable(source)

  return [
    {
      key: 'copy',
      label: '复制',
      icon: 'copy',
      disabled: !selectedText,
      onSelect: () => {
        void navigator.clipboard?.writeText(selectedText).catch(() => {})
      },
    },
    {
      key: 'paste',
      label: '粘贴',
      icon: 'paste',
      disabled: !editable,
      onSelect: () => {
        if (!editable) return
        void navigator.clipboard
          ?.readText()
          .then((text) => {
            if (!text) return
            // 菜单点击会让目标失焦，先聚焦回原编辑元素再插入
            editable.focus()
            document.execCommand('insertText', false, text)
          })
          .catch(() => {})
      },
    },
    {
      key: 'refresh',
      label: '刷新',
      icon: 'refresh',
      divider: true,
      onSelect: () => window.location.reload(),
    },
  ]
}
