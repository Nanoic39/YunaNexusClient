import { createApp } from 'vue'
import { currentUserApi, readEnv, session, siteContent } from '@yuna/core'
import '@yuna/theme/styles.css'
import App from './App.vue'
import { router } from './router'

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
  // 门户内容以接口为准：先以缓存 / 默认值渲染，接口返回后自动更新，避免首屏空白
  void siteContent.loadPublic()
  // 已登录时回填角色 / 权限 / 菜单，供「进入管理后台」入口等按需展示
  if (session.isAuthenticated.value) {
    void currentUserApi
      .me()
      .then((view) => session.setCurrentUser(view))
      .catch(() => undefined)
  }
  createApp(App).use(router).mount('#app')
}

void bootstrap()
