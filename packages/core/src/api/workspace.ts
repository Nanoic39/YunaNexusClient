import { userHttp, http } from '../http/client'
import type { FileView, PageResult } from '../types'
export interface FileShare {
  shareId: string
  fileId: number
  fileName: string
  protectedByCode: boolean
  createdAt: string
  expiresAt: string
  revoked: boolean
}
export interface ApplicationGrant {
  clientCode: string
  clientName: string
  redirectUri: string | null
  status: number
  authorizedAt: string
  essential: boolean
}
export interface PersonalApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  createdAt: string
  expiresAt: string
  lastUsedAt: string | null
  revoked: boolean
}
const FILE = '/api/v1/file/me'
function upload(path: string, file: File, signal?: AbortSignal) {
  const body = new FormData()
  body.append('file', file)
  return userHttp.request<FileView>(path, { method: 'POST', body, signal })
}
export const workspaceApi = {
  files: (page = 1, search = '', signal?: AbortSignal) =>
    userHttp.request<PageResult<FileView>>(FILE, { query: { page, size: 20, search }, signal }),
  upload: (file: File, signal?: AbortSignal) => upload(`${FILE}/upload`, file, signal),
  avatar: (file: File) => upload(`${FILE}/avatar`, file),
  download: (id: number, signal?: AbortSignal) =>
    userHttp.request<Blob>(`${FILE}/${id}/download`, { responseType: 'blob', signal }),
  rename: (id: number, fileName: string) =>
    userHttp.request<FileView>(`${FILE}/${id}/rename`, { method: 'POST', body: { fileName } }),
  delete: (id: number) => userHttp.request<void>(`${FILE}/${id}/delete`, { method: 'POST' }),
  shares: () => userHttp.request<FileShare[]>(`${FILE}/shares`),
  share: (fileId: number, days: number, code: string) =>
    userHttp.request<FileShare>(`${FILE}/shares`, { method: 'POST', body: { fileId, days, code } }),
  revokeShare: (id: string) =>
    userHttp.request<void>(`${FILE}/shares/${encodeURIComponent(id)}/revoke`, { method: 'POST' }),
  shareInfo: (shareId: string, code: string) =>
    http.request<{ fileName: string; size: number }>('/api/v1/file/public/share/info', {
      method: 'POST',
      body: { shareId, code },
      mutate: false,
    }),
  sharedDownload: (shareId: string, code: string) =>
    http.request<Blob>('/api/v1/file/public/share/download', {
      method: 'POST',
      body: { shareId, code },
      mutate: false,
      responseType: 'blob',
    }),
  applications: () => userHttp.request<ApplicationGrant[]>('/api/v1/auth/account/applications'),
  revokeApplication: (id: string) =>
    userHttp.request<void>(`/api/v1/auth/account/applications/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
    }),
  keys: () => userHttp.request<PersonalApiKey[]>('/api/v1/auth/account/api-keys'),
  createKey: (name: string, scopes: string[], days: number) =>
    userHttp.request<{ key: PersonalApiKey; token: string }>('/api/v1/auth/account/api-keys', {
      method: 'POST',
      body: { name, scopes, days },
    }),
  revokeKey: (id: string) =>
    userHttp.request<void>(`/api/v1/auth/account/api-keys/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
    }),
}
export function shareUrl(id: string): string {
  return `${location.origin}/share#id=${encodeURIComponent(id)}`
}
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return
  }
  const field = document.createElement('textarea')
  field.value = value
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.append(field)
  field.select()
  const ok = document.execCommand('copy')
  field.remove()
  if (!ok) throw new Error('浏览器不支持自动复制，请手动选择复制')
}
