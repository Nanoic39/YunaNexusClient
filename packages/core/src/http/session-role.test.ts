import { afterEach, expect, it } from 'vitest'
import { session } from './session'
afterEach(() => session.clearUser())
it('allows super_admin and admin to enter the console but denies user', () => {
  for (const [roleCode, allowed] of [
    ['user', false],
    ['admin', true],
    ['super_admin', true],
  ] as const) {
    session.setTokens(
      {
        accessToken: 'development-test-token',
        refreshToken: 'development-test-refresh',
        expiresIn: 60,
        externalId: 'test-user',
      },
      'web',
    )
    session.setCurrentUser({
      userId: 7,
      roles: [{ id: 1, roleCode, roleName: roleCode }],
      permissions: [],
      menus: [],
    })
    expect(session.canAccessAdmin.value).toBe(allowed)
  }
})
