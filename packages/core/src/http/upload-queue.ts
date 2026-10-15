import { ApiError, NetworkError } from './errors'
/** 上传队列在内存中保存文件引用；中止后的不确定结果不自动重传。 */
export type UploadState = '等待' | '上传中' | '完成' | '失败' | '已取消' | '待确认'
export interface UploadEntry {
  id: number
  file: File
  state: UploadState
  error: string
  retryable: boolean
}
export class UploadQueue {
  private entries: UploadEntry[] = []
  private controller?: AbortController
  private stopped = false
  private disposed = false
  running = false
  constructor(
    private send: (file: File, signal: AbortSignal) => Promise<unknown>,
    private changed: (entries: UploadEntry[], running: boolean) => void,
    private failed: (error: unknown) => void = () => {},
  ) {}
  private emit() {
    if (!this.disposed)
      this.changed(
        this.entries.map((e) => ({ ...e })),
        this.running,
      )
  }
  async start(files: File[]) {
    if (this.running || this.disposed) return
    if (files.length > 20) throw new Error('每批最多上传 20 个文件')
    this.entries = files.map((file, id) => ({
      id,
      file,
      state: '等待',
      error: '',
      retryable: true,
    }))
    await this.run(this.entries)
  }
  async retry() {
    if (this.running || this.disposed) return
    await this.run(
      this.entries.filter((e) => e.retryable && (e.state === '失败' || e.state === '已取消')),
    )
  }
  cancel() {
    this.stopped = true
    this.controller?.abort()
  }
  dispose() {
    this.disposed = true
    this.cancel()
    this.entries = []
  }
  private async run(entries: UploadEntry[]) {
    if (!entries.length) return
    this.running = true
    this.stopped = false
    for (const e of entries) {
      e.state = '等待'
      e.error = ''
    }
    this.emit()
    try {
      for (const e of entries) {
        if (this.disposed) break
        if (this.stopped) {
          e.state = '已取消'
          this.emit()
          continue
        }
        if (!e.file.size || e.file.size > 20 * 1024 * 1024) {
          e.state = '失败'
          e.retryable = false
          e.error = '请选择 1B~20MB 的文件'
          this.emit()
          continue
        }
        const controller = new AbortController()
        this.controller = controller
        e.state = '上传中'
        this.emit()
        try {
          await this.send(e.file, controller.signal)
          e.state = '完成'
          e.retryable = false
        } catch (error) {
          if (controller.signal.aborted) {
            e.state = '待确认'
            e.retryable = false
            e.error = '请求已中止，服务器可能已保存，请先刷新文件列表确认'
          } else {
            const uncertain =
              error instanceof NetworkError ||
              (error instanceof ApiError && error.httpStatus >= 500)
            e.state = uncertain ? '待确认' : '失败'
            e.retryable = !uncertain
            e.error = error instanceof Error ? error.message : '上传失败'
            this.failed(error)
          }
        } finally {
          this.controller = undefined
          this.emit()
        }
      }
    } finally {
      this.running = false
      this.emit()
    }
  }
}
