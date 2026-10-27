import { createApp } from 'vue'
import { consumeHandoff, loadCurrentUser, readEnv, session } from '@yuna/core'
import '@yuna/theme/styles.css'
import { vContextMenu } from '@yuna/ui'
import App from './App.vue'

/**
 * 应用启动引导。
 *
 * `import.meta.env.DEV` 为构建期常量：生产构建时整个分支被摇掉，`msw` 不会进入产物；
 * 开发服务器下再由 `enableMock`（开发模式默认开启，可用 VITE_ENABLE_MOCK=false 关闭）决定。
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.DEV && readEnv().enableMock) {
    const { startMock } = await import('@yuna/core/mock')
    await startMock()
  }
  // 消费一次性授权码并校验 state/PKCE（不同域/端口部署），须在挂载前完成
  await consumeHandoff()
  // 已登录时刷新角色 / 权限视图，保证管理角色放行判据与后端一致。
  // `loadCurrentUser` 仅在 401 时清理会话；瞬时故障保留既有会话，
  // 避免把「角色尚未加载」误判为「无管理权限」并锁死在 403。
  if (session.isAuthenticated.value) {
    await loadCurrentUser()
  }
  // 授权码清理和回跳完成后再创建 history，避免路由仍捕获旧的 callback 地址。
  const { router } = await import('./router')
  createApp(App).use(router).directive('context-menu', vContextMenu).mount('#app')
}

void bootstrap()
