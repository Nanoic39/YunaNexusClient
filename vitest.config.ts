import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: [
      'packages/core/src/**/*.test.ts',
      'packages/ui/src/**/*.test.ts',
      'apps/user/src/**/*.test.ts',
    ],
    environment: 'node',
  },
})
