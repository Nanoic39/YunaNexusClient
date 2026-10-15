import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export { handlers } from './handlers'
export * from './data'

/**
 * 启动浏览器端 Mock。
 *
 * 依赖 `public/mockServiceWorker.js`（由 `pnpm msw:init` 生成）。
 * 返回 worker 实例，便于在测试中 `worker.stop()`。
 */
export async function startMock() {
  const worker = setupWorker(...handlers)
  await worker.start({
    // 未匹配的请求直接放行，避免影响静态资源 / HMR
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  return worker
}
