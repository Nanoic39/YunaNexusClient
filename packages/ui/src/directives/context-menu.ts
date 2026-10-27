/**
 * `v-context-menu` 指令：把任意元素声明为右键目标。
 *
 * 用法：
 * ```html
 * <div v-context-menu="{ kind: 'table-row', payload: row }">…</div>
 * <div v-context-menu="() => ({ kind: 'file', payload: file })">…</div>
 * <div v-context-menu="{ kind: 'blank', enabled: false }">…</div>
 * ```
 *
 * 指令只负责"在哪儿右键、右键的是什么"，菜单内容由 `registerContextMenuProvider`
 * 按 `kind` 注册的提供者决定，因此内容区与菜单定义彻底解耦：
 * 同一个区域在不同状态下（选中/多选/只读）可以给出完全不同的菜单。
 *
 * 同时补齐键盘可达性：焦点在目标元素上时按 Menu 键或 Shift+F10 等价于右键。
 */
import type { Directive, DirectiveBinding } from 'vue'
import {
  openContextMenu,
  resolveContextMenuItems,
  type ContextMenuContext,
} from '../composables/use-context-menu'

export interface ContextMenuBinding {
  /** 区域名，与提供者注册的 kind 对应 */
  kind: string
  /** 传给提供者的业务负载 */
  payload?: unknown
  /** 置 false 时该元素不接管右键 */
  enabled?: boolean
}

type Resolvable = ContextMenuBinding | (() => ContextMenuBinding)

const bindings = new WeakMap<HTMLElement, Resolvable>()
const listeners = new WeakMap<HTMLElement, (event: MouseEvent) => void>()
const keyListeners = new WeakMap<HTMLElement, (event: KeyboardEvent) => void>()

function read(element: HTMLElement): ContextMenuBinding | null {
  const source = bindings.get(element)
  if (!source) return null
  const binding = typeof source === 'function' ? source() : source
  if (!binding || !binding.kind) return null
  if (binding.enabled === false) return null
  return binding
}

function open(element: HTMLElement, event: MouseEvent): void {
  const binding = read(element)
  if (!binding) return
  const context: ContextMenuContext = {
    kind: binding.kind,
    payload: binding.payload,
    event,
    target: element,
  }
  const items = resolveContextMenuItems(context)
  if (!items.length) return
  event.preventDefault()
  // 阻止冒泡到 document：否则上一层会再弹一次默认菜单
  event.stopPropagation()
  openContextMenu({
    x: event.clientX,
    y: event.clientY,
    items,
    opener: element,
  })
}

function openFromKeyboard(element: HTMLElement): void {
  const binding = read(element)
  if (!binding) return
  const rect = element.getBoundingClientRect()
  const context: ContextMenuContext = {
    kind: binding.kind,
    payload: binding.payload,
    event: new MouseEvent('contextmenu', { bubbles: false }),
    target: element,
  }
  const items = resolveContextMenuItems(context)
  if (!items.length) return
  openContextMenu({
    x: rect.left + Math.min(24, rect.width / 2),
    y: rect.top + Math.min(24, rect.height / 2),
    items,
    opener: element,
  })
}

function attach(element: HTMLElement): void {
  if (listeners.has(element)) return
  const onContextMenu = (event: MouseEvent): void => open(element, event)
  const onKeydown = (event: KeyboardEvent): void => {
    const isMenuKey = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
    if (!isMenuKey) return
    event.preventDefault()
    openFromKeyboard(element)
  }
  element.addEventListener('contextmenu', onContextMenu)
  element.addEventListener('keydown', onKeydown)
  listeners.set(element, onContextMenu)
  keyListeners.set(element, onKeydown)
}

function detach(element: HTMLElement): void {
  const onContextMenu = listeners.get(element)
  const onKeydown = keyListeners.get(element)
  if (onContextMenu) element.removeEventListener('contextmenu', onContextMenu)
  if (onKeydown) element.removeEventListener('keydown', onKeydown)
  listeners.delete(element)
  keyListeners.delete(element)
  bindings.delete(element)
}

export const vContextMenu: Directive<HTMLElement, Resolvable> = {
  mounted(element, binding: DirectiveBinding<Resolvable>) {
    bindings.set(element, binding.value)
    attach(element)
  },
  updated(element, binding: DirectiveBinding<Resolvable>) {
    bindings.set(element, binding.value)
    attach(element)
  },
  beforeUnmount(element) {
    detach(element)
  },
}
