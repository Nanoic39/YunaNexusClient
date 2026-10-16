import { beforeEach, describe, it, expect, vi } from 'vitest'
const request = vi.hoisted(() => vi.fn())
vi.mock('../http/client', () => ({ userHttp: { request }, adminHttp: { request } }))
import { noticeApi, noticeRevision } from './notice'
beforeEach(() => {
  request.mockReset()
  noticeRevision.value = 0
})
describe('Inbox synchronization only follows successful server writes', () => {
  it('does not publish success when marking a message fails', async () => {
    request.mockRejectedValue(new Error('offline'))
    await expect(noticeApi.markRead(12)).rejects.toThrow('offline')
    expect(noticeRevision.value).toBe(0)
  })
  it('keeps other views informed after single and global reads', async () => {
    request.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ changed: 31 })
    await noticeApi.markRead(12)
    expect(noticeRevision.value).toBe(1)
    expect(await noticeApi.markAllRead()).toEqual({ changed: 31 })
    expect(noticeRevision.value).toBe(2)
  })
  it('passes status filtering and cancellation to the server rather than filtering a page locally', async () => {
    const controller = new AbortController()
    request.mockResolvedValue({ records: [], total: 25 })
    await noticeApi.inbox({ page: 2, size: 10, status: 1 }, controller.signal)
    expect(request).toHaveBeenCalledWith('/api/v1/notice/inbox', {
      query: { page: 2, size: 10, status: 1 },
      signal: controller.signal,
    })
    expect(noticeRevision.value).toBe(0)
  })
})
