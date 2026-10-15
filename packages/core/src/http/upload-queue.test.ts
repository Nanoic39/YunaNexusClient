import { expect, it, vi } from 'vitest'
import { File } from 'node:buffer'
import { UploadQueue, type UploadEntry } from './upload-queue'
import { ApiError, NetworkError } from './errors'
const file = (name: string) => new File(['content'], name) as unknown as globalThis.File
function fixture(send: (f: globalThis.File, s: AbortSignal) => Promise<unknown>) {
  let rows: UploadEntry[] = []
  const changed = vi.fn((items: UploadEntry[]) => {
    rows = items
  })
  const queue = new UploadQueue(send, changed)
  return { queue, changed, rows: () => rows }
}
it('retries failed files without uploading completed files again', async () => {
  let failed = true
  const send = vi.fn(async (f: globalThis.File) => {
    if (f.name === 'b.txt' && failed) {
      failed = false
      throw new ApiError({ code: 400, message: '暂时不可用', httpStatus: 409 })
    }
    return {}
  })
  const f = fixture(send)
  await f.queue.start([file('a.txt'), file('b.txt')])
  expect(f.rows().map((e) => e.state)).toEqual(['完成', '失败'])
  await f.queue.retry()
  expect(send.mock.calls.map((c) => c[0].name)).toEqual(['a.txt', 'b.txt', 'b.txt'])
  expect(f.rows().every((e) => e.state === '完成')).toBe(true)
})
it('aborts the active request and resumes only files that never started', async () => {
  const send = vi.fn(
    (_: globalThis.File, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true,
        })
      }),
  )
  const f = fixture(send)
  const run = f.queue.start([file('a.txt'), file('b.txt')])
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
  f.queue.cancel()
  await run
  expect(send.mock.calls[0]![1].aborted).toBe(true)
  expect(f.rows().map((e) => e.state)).toEqual(['待确认', '已取消'])
  send.mockImplementation(async () => ({}))
  await f.queue.retry()
  expect(send.mock.calls.map((c) => c[0].name)).toEqual(['a.txt', 'b.txt'])
})
it('does not retry network failures with an uncertain save result', async () => {
  const send = vi.fn(async () => {
    throw new NetworkError('connection lost')
  })
  const f = fixture(send)
  await f.queue.start([file('a.txt')])
  await f.queue.retry()
  expect(f.rows()[0]?.state).toBe('待确认')
  expect(send).toHaveBeenCalledTimes(1)
})
it('disposal aborts active uploads and suppresses later UI updates', async () => {
  const send = vi.fn(
    (_: globalThis.File, signal: AbortSignal) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      ),
  )
  const f = fixture(send)
  const run = f.queue.start([file('a.txt'), file('b.txt')])
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
  const events = f.changed.mock.calls.length
  f.queue.dispose()
  await run
  expect(f.changed).toHaveBeenCalledTimes(events)
  expect(send).toHaveBeenCalledTimes(1)
})
it('rejects oversize or empty files before issuing a request', async () => {
  const send = vi.fn(async () => ({}))
  const f = fixture(send)
  await f.queue.start([new File([], 'empty') as unknown as globalThis.File])
  expect(f.rows()[0]?.state).toBe('失败')
  await f.queue.retry()
  expect(send).not.toHaveBeenCalled()
  await expect(f.queue.start(Array.from({ length: 21 }, () => file('x')))).rejects.toThrow('20')
})
