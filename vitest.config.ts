import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: [
      'packages/core/src/**/*.test.ts',
      'packages/theme/src/**/*.test.ts',
      'packages/ui/src/**/*.test.ts',
      'apps/user/src/**/*.test.ts',
      'apps/web/src/**/*.test.ts',
    ],
    environment: 'node',
  },
})
