import { createApp } from 'vue'
import '@yuna/theme/styles.css'
import './app/workspace.css'
import App from './App.vue'
async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK === 'true') {
    const { startMock } = await import('@yuna/core/mock')
    await startMock()
  }
  const { router } = await import('./router')
  createApp(App).use(router).mount('#app')
}
void start()
