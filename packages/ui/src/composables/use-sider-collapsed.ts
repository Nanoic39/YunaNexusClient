/**
 * 侧栏折叠态：跨刷新持久化。
 *
 * 同步从 localStorage 恢复初值（模块加载即完成），保证首帧渲染的就是最终状态 ——
 * 刷新后既不重置，也不会出现「先展开再收起」的闪烁或二次跳动。
 *
 * 用户端与管理端共用同一 key：同源部署下两端保持一致，不同源时各自独立。
 */
import { computed, ref } from 'vue'

const STORAGE_KEY = 'yuna.sider-collapsed'

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    /* 隐私模式 / 存储不可用时默认展开 */
    return false
  }
}

/** 模块级单例：同一页面内所有消费方共享同一折叠态 */
const collapsedState = ref(load())

export function useSiderCollapsed() {
  const collapsed = computed<boolean>({
    get: () => collapsedState.value,
    set: (value) => {
      if (value === collapsedState.value) return
      collapsedState.value = value
      try {
        localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
      } catch {
        /* 静默降级为内存态 */
      }
    },
  })

  return { collapsed }
}
