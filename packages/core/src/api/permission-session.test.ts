import { beforeEach, describe, expect, it, vi } from 'vitest'
const request = vi.hoisted(() => vi.fn())
vi.mock('../http/client', () => ({ userHttp: { request }, adminHttp: { request } }))
import { loadCurrentUser } from './permission'
import { session } from '../http/session'
import { ApiError } from '../http/errors'
const tokens = (id: string) => ({
  accessToken: id,
  refreshToken: id,
  externalId: id,
  expiresIn: 60,
})
beforeEach(() => {
  request.mockReset()
  session.clearAll()
})
describe('Permission bootstrap belongs to its original account', () => {
  it('does not clear a newly logged-in account when an old request returns 401', async () => {
    session.setTokens(tokens('old'), 'web')
    let reject!: (e: unknown) => void
    request.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )
    const pending = loadCurrentUser(0)
    session.setTokens(tokens('new'), 'web')
    reject(new ApiError({ code: 401, httpStatus: 401, message: 'expired' }))
    expect(await pending).toBe(false)
    expect(session.state.externalId).toBe('new')
    expect(session.state.accessToken).toBe('new')
  })
  it('does not apply the previous account roles to the next account', async () => {
    session.setTokens(tokens('old'), 'web')
    let resolve!: (value: unknown) => void
    request.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const pending = loadCurrentUser(0)
    session.setTokens(tokens('new'), 'web')
    resolve({
      roles: [{ id: 1, roleCode: 'super_admin', roleName: 'root' }],
      permissions: [],
      menus: [],
      userId: 1,
    })
    expect(await pending).toBe(false)
    expect(session.state.rolesLoaded).toBe(false)
    expect(session.canEnterAdmin.value).toBe(false)
  })
})
