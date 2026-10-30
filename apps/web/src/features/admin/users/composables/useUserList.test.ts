import { describe, it, expect, vi } from 'vitest'
import type { AdminUserView, PageResult } from '@yuna/core/types'
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  disable: vi.fn(),
  unlock: vi.fn(),
  warning: vi.fn(),
}))
vi.mock('@yuna/core', () => ({
  authAdminApi: { listUsers: mocks.list, disableUser: mocks.disable, unlockUser: mocks.unlock },
  toErrorMessage: (e: Error) => e.message,
}))
vi.mock('naive-ui', () => ({ useDialog: () => ({ warning: mocks.warning }) }))
vi.mock('vue', async (original) => ({
  ...(await original<typeof import('vue')>()),
  onMounted: vi.fn(),
}))
import { useUserList } from './useUserList'
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function result(username: string) {
  return {
    records: [{ userId: 1, username }],
    total: 1,
    page: 1,
    size: 20,
  } as PageResult<AdminUserView>
}
describe('user management orchestration', () => {
  it('does not let a stale response overwrite the newest query', async () => {
    const old = deferred<PageResult<AdminUserView>>()
    const recent = deferred<PageResult<AdminUserView>>()
    mocks.list.mockReset().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise)
    const view = useUserList()
    const first = view.load()
    view.keyword.value = 'new'
    const second = view.load()
    recent.resolve(result('new'))
    await second
    old.resolve(result('stale'))
    await first
    expect(view.rows.value[0].username).toBe('new')
    expect(view.loading.value).toBe(false)
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'new' }))
  })
  it('does not disable until the dangerous-action confirmation is accepted', () => {
    mocks.warning.mockClear()
    mocks.disable.mockClear()
    useUserList().disable({ userId: 1, username: 'test' } as AdminUserView)
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(mocks.warning).toHaveBeenCalledWith(
      expect.objectContaining({ positiveText: '确认禁用', onPositiveClick: expect.any(Function) }),
    )
  })
  it('reports a failed operation and releases the busy state', async () => {
    mocks.unlock.mockRejectedValueOnce(new Error('操作被拒绝'))
    const view = useUserList()
    view.unlock({ userId: 1, username: 'test' } as AdminUserView)
    await vi.waitFor(() => expect(view.error.value).toBe('操作被拒绝'))
    expect(view.acting.value).toBe(false)
  })
})
