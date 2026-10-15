import { createApp } from 'vue'
import { readEnv } from '@yuna/core'
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
  createApp(App).use(router).mount('#app')
}

void bootstrap()
