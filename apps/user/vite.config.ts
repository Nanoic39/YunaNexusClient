import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const secret = Object.keys(env).find((key) => /(?:TOKEN|SECRET|PASSWORD|_KEY)$/.test(key) && env[key]?.trim())
    if (secret) throw new Error(`Production build rejects secret variable: ${secret}`)
  }
  return {
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 工作区内的源码包交由 Vite 直接编译，避免预打包导致的 HMR 失效
  optimizeDeps: {
    exclude: ['@yuna/core', '@yuna/theme', '@yuna/ui'],
  },
  server: {
    port: 5174,
    // 关闭 Mock 时把 /api 转发到本地网关，规避开发期跨域
    proxy: {
      '/api': { target: 'http://localhost:8010', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  }
})
