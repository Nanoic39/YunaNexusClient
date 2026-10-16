import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  users: vi.fn(),
  bindings: vi.fn(),
  roles: vi.fn(),
  permissions: vi.fn(),
}))
vi.mock('./auth', () => ({ authAdminApi: { listUsers: mocks.users } }))
vi.mock('./permission', () => ({
  roleApi: { list: mocks.roles, listPermissions: mocks.permissions },
  userRoleApi: { list: mocks.bindings },
}))
import { audienceApi } from './audience'
const user = (id: number) => ({ userId: id, username: `user${id}` })
beforeEach(() => {
  vi.resetAllMocks()
})
describe('Audience resolution must never silently omit recipients', () => {
  it('rejects an oversized directory before issuing individual role lookups', async () => {
    mocks.users.mockResolvedValue({ records: [user(1)], total: 5001 })
    await expect(audienceApi.resolveUsers({ mode: 'roles', roleIds: [1] })).rejects.toThrow(
      '安全解析范围',
    )
    expect(mocks.bindings).not.toHaveBeenCalled()
  })
  it('aborts when any role lookup fails instead of interpreting failure as no role', async () => {
    mocks.users.mockResolvedValue({ records: [user(1), user(2)], total: 2 })
    mocks.bindings.mockRejectedValue(new Error('unavailable'))
    await expect(audienceApi.resolveUsers({ mode: 'roles', roleIds: [1] })).rejects.toThrow(
      '角色查询失败',
    )
  })
  it('rejects incomplete or duplicate pages instead of returning a partial audience', async () => {
    mocks.users.mockResolvedValue({ records: [user(1), user(1)], total: 2 })
    await expect(audienceApi.listAllUsers()).rejects.toThrow('不完整')
  })
  it('does not scan all users for an empty selection', async () => {
    expect(await audienceApi.resolveUsers({ mode: 'roles', roleIds: [] })).toEqual([])
    expect(await audienceApi.resolveUsers({ mode: 'permissions', permissionIds: [] })).toEqual([])
    expect(mocks.users).not.toHaveBeenCalled()
  })
  it('resolves complete matching recipients without suppressing nonmatching users', async () => {
    mocks.users.mockResolvedValue({ records: [user(1), user(2)], total: 2 })
    mocks.bindings.mockImplementation(async (id: number) => (id === 1 ? [7] : [8]))
    expect(
      (await audienceApi.resolveUsers({ mode: 'roles', roleIds: [7] })).map((u) => u.userId),
    ).toEqual([1])
  })
})
