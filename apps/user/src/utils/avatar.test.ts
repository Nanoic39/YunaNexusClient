import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ download: vi.fn(), state: { externalId: 'owner-a' } }))
vi.mock('@yuna/core', () => ({
  workspaceApi: { download: mocks.download },
  safeAvatarUrl: (v: string) => v,
  session: { state: mocks.state },
}))
import { clearAvatar, currentAvatar, loadAvatar } from './avatar'
beforeEach(() => {
  clearAvatar()
  vi.clearAllMocks()
  mocks.state.externalId = 'owner-a'
  vi.stubGlobal('location', { origin: 'http://localhost' })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fixture')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => {
  clearAvatar()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('coalesces layout and profile requests for the same avatar', async () => {
  let finish!: (value: Blob) => void
  mocks.download.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const first = loadAvatar('file:12'),
    second = loadAvatar('file:12')
  expect(first).toBe(second)
  expect(mocks.download).toHaveBeenCalledTimes(1)
  finish(new Blob(['image']))
  await first
  await loadAvatar('file:12')
  expect(currentAvatar.value).toBe('blob:fixture')
  expect(mocks.download).toHaveBeenCalledTimes(1)
})
it('aborts and ignores a private avatar response after an account switch', async () => {
  let finish!: (value: Blob) => void
  mocks.download.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const first = loadAvatar('file:12')
  const signal = mocks.download.mock.calls[0]![1] as AbortSignal
  mocks.state.externalId = 'owner-b'
  clearAvatar()
  finish(new Blob(['old private image']))
  await first
  expect(signal.aborted).toBe(true)
  expect(currentAvatar.value).toBeUndefined()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
})
it('does not reuse an avatar URL across accounts and releases old object URLs', async () => {
  mocks.download.mockResolvedValue(new Blob(['image']))
  await loadAvatar('file:12')
  mocks.state.externalId = 'owner-b'
  await loadAvatar('file:12')
  expect(mocks.download).toHaveBeenCalledTimes(2)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture')
})
it('allows retry after a failed download and rejects imprecise file identifiers', async () => {
  mocks.download.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(new Blob(['image']))
  await loadAvatar('file:12')
  await loadAvatar('file:12')
  expect(mocks.download).toHaveBeenCalledTimes(2)
  await loadAvatar('file:9007199254740993')
  expect(mocks.download).toHaveBeenCalledTimes(2)
  expect(currentAvatar.value).toBeUndefined()
})
