import { userHttp } from '../http/client'
import type { FileView, PageQuery, PageResult } from '../types'

const BASE = '/api/v1/file'

/** 文件中心 · 终端用户接口 */
export const fileApi = {
  /** 上传文件（单文件，≤ 20MB） */
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return userHttp.request<FileView>(`${BASE}/upload`, { method: 'POST', body: form })
  },

  /** 下载文件（返回 Blob） */
  download: (fileId: number) => userHttp.request<Blob>(`${BASE}/download/${fileId}`, { responseType: 'blob' }),

  /** 逻辑删除文件 */
  remove: (fileId: number) => userHttp.request<void>(`${BASE}/delete/${fileId}`, { method: 'POST' }),

  /** 文件列表（分页，数据权限过滤） */
  list: (query?: PageQuery) => userHttp.request<PageResult<FileView>>(`${BASE}/list`, { query }),
}
