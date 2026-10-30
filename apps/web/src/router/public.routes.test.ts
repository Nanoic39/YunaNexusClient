import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { publicRoutes } from './public.routes'
import { portalRoutes } from './portal.routes'
import { adminRoutes } from './admin.routes'
describe('public and protected route boundaries', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [publicRoutes, portalRoutes, adminRoutes],
  })
  it('allows the homepage and about page without a session', () => {
    expect(router.resolve('/').meta.public).toBe(true)
    expect(router.resolve('/about').meta.public).toBe(true)
  })
  it('does not accidentally inherit public access in personal or admin routes', () => {
    for (const path of ['/usr', '/usr/settings', '/console', '/console/users'])
      expect(router.resolve(path).meta.public).not.toBe(true)
    expect(router.resolve('/console/users').meta.requiresAdmin).toBe(true)
  })
})
