import { expect, it } from 'vitest'
import { parseEnv } from './env'
it('keeps OAuth registration closed in production even if Mock is requested', () => {
  const env = parseEnv({
    PROD: true,
    DEV: false,
    VITE_APP_ENV: 'development',
    VITE_ENABLE_MOCK: 'true',
    VITE_OAUTH_APP_REGISTRATION_ENABLED: 'false',
  })
  expect(env.enableMock).toBe(false)
  expect(env.oauthAppRegistrationEnabled).toBe(false)
})
it('requires an explicit switch for a real backend', () => {
  expect(
    parseEnv({ PROD: true, VITE_OAUTH_APP_REGISTRATION_ENABLED: 'true' })
      .oauthAppRegistrationEnabled,
  ).toBe(true)
  expect(parseEnv({ PROD: true }).oauthAppRegistrationEnabled).toBe(false)
})
it('allows offline Mock preview without enabling an incomplete development backend', () => {
  const env = {
    PROD: false,
    DEV: true,
    VITE_APP_ENV: 'development',
    VITE_OAUTH_APP_REGISTRATION_ENABLED: 'false',
  }
  expect(parseEnv({ ...env, VITE_ENABLE_MOCK: 'true' }).oauthAppRegistrationEnabled).toBe(true)
  expect(parseEnv({ ...env, VITE_ENABLE_MOCK: 'false' }).oauthAppRegistrationEnabled).toBe(false)
})
