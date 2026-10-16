import { http, HttpResponse } from 'msw'
import { mockFiles } from './data'
import type { FileView } from '../types'
import type { FileShare, PersonalApiKey } from '../api/workspace'
const files = [...mockFiles],
  blobs = new Map<number, Blob>(),
  shares: FileShare[] = [],
  keys: PersonalApiKey[] = []
const codes = new Map<string, string>()
const grants = [
  {
    clientCode: 'web',
    clientName: 'YunaNexus 用户门户',
    redirectUri: 'http://localhost:3000/',
    status: 1,
    authorizedAt: new Date().toISOString(),
    essential: true,
  },
  {
    clientCode: 'admin',
    clientName: 'YunaNexus 管理控制台',
    redirectUri: 'http://localhost:3001/',
    status: 1,
    authorizedAt: new Date().toISOString(),
    essential: false,
  },
]
const result = (data: unknown) =>
  HttpResponse.json({
    code: 200,
    msg: '操作成功',
    data,
    tips: null,
    traceId: 'mock-workspace',
    timestamp: Date.now(),
  })
const fail = (msg: string) => HttpResponse.json({ code: 404, msg, data: null }, { status: 404 })
const denied = (request: Request) => !request.headers.get('Authorization')?.startsWith('Bearer ')
const now = () => new Date().toISOString()
export const workspaceHandlers = [
  http.get('/api/v1/auth/account/security', ({ request }) => {
    if (denied(request)) return fail('请先登录')
    return result({
      username: 'development-user',
      email: 'development@example.invalid',
      passwordUpdatedAt: now(),
    })
  }),
  http.get('/api/v1/auth/admin/password-reset-records', ({ request }) => {
    if (denied(request)) return fail('请先登录')
    return result([])
  }),
  http.get('/api/v1/file/me', ({ request }) => {
    if (denied(request)) return fail('请先登录')
    const q = new URL(request.url).searchParams,
      p = Number(q.get('page') || 1),
      size = Number(q.get('size') || 20),
      filtered = files.filter((f) => f.fileName.includes(q.get('search') || ''))
    return result({
      records: filtered.slice((p - 1) * size, p * size),
      page: p,
      size,
      total: filtered.length,
    })
  }),
  ...['upload', 'avatar'].map((action) =>
    http.post(`/api/v1/file/me/${action}`, async ({ request }) => {
      if (denied(request)) return fail('请先登录')
      const data = await request.formData(),
        file = data.get('file') as File
      const view: FileView = {
        fileId: Date.now(),
        fileName: action === 'avatar' ? 'avatar.jpg' : file.name,
        ext: file.name.split('.').pop() ?? null,
        contentType: file.type,
        size: file.size,
        sha256: null,
        createBy: 1,
        deptId: null,
        createTime: now(),
      }
      files.unshift(view)
      blobs.set(view.fileId, file)
      return result(view)
    }),
  ),
  http.get('/api/v1/file/me/:id/download', ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const file = files.find((f) => f.fileId === Number(params.id))
    if (!file) return fail('文件不存在')
    return new HttpResponse(
      blobs.get(file.fileId) ?? new Blob(['Development fixture'], { type: 'text/plain' }),
      {
        headers: {
          'Content-Disposition': 'attachment',
          'Content-Type': file.contentType ?? 'application/octet-stream',
        },
      },
    )
  }),
  http.post('/api/v1/file/me/:id/rename', async ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const file = files.find((f) => f.fileId === Number(params.id))
    if (!file) return fail('文件不存在')
    const body = (await request.json()) as { fileName?: string }
    const name = body.fileName?.trim() ?? ''
    const extension = (value: string) =>
      value.lastIndexOf('.') > 0 ? value.slice(value.lastIndexOf('.')).toLowerCase() : ''
    if (
      !name ||
      name.length > 255 ||
      /[\\/\x00-\x1f\x7f-\x9f]/.test(name) ||
      extension(name) !== extension(file.fileName)
    )
      return HttpResponse.json(
        { code: 400, msg: '文件名无效，请保留原扩展名', data: null },
        { status: 400 },
      )
    file.fileName = name
    shares.filter((s) => s.fileId === file.fileId).forEach((s) => (s.fileName = name))
    return result(file)
  }),
  http.post('/api/v1/file/me/:id/delete', ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const i = files.findIndex((f) => f.fileId === Number(params.id))
    if (i < 0) return fail('文件不存在')
    files.splice(i, 1)
    blobs.delete(Number(params.id))
    return result(null)
  }),
  http.get('/api/v1/file/me/shares', ({ request }) =>
    denied(request) ? fail('请先登录') : result(shares),
  ),
  http.post('/api/v1/file/me/shares', async ({ request }) => {
    if (denied(request)) return fail('请先登录')
    const body = (await request.json()) as { fileId: number; days: number; code: string }
    const file = files.find((f) => f.fileId === body.fileId)
    if (!file) return fail('文件不存在')
    const s: FileShare = {
      shareId: crypto.randomUUID().replaceAll('-', '') + 'mock1234567',
      fileId: file.fileId,
      fileName: file.fileName,
      protectedByCode: !!body.code,
      createdAt: now(),
      expiresAt: new Date(Date.now() + body.days * 86400000).toISOString(),
      revoked: false,
    }
    codes.set(s.shareId, body.code)
    shares.unshift(s)
    return result(s)
  }),
  http.post('/api/v1/file/me/shares/:id/revoke', ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const s = shares.find((s) => s.shareId === params.id)
    if (!s) return fail('分享不存在')
    s.revoked = true
    return result(null)
  }),
  http.get('/api/v1/auth/account/applications', ({ request }) =>
    denied(request) ? fail('请先登录') : result(grants),
  ),
  http.post('/api/v1/auth/account/applications/:id/revoke', ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const grant = grants.find((g) => g.clientCode === params.id)
    if (!grant || grant.essential) return fail('授权不可撤销')
    grant.status = 0
    return result(null)
  }),
  ...['info', 'download'].map((action) =>
    http.post(`/api/v1/file/public/share/${action}`, async ({ request }) => {
      const body = (await request.json()) as { shareId: string; code: string }
      const share = shares.find((s) => s.shareId === body.shareId)
      if (
        !share ||
        share.revoked ||
        new Date(share.expiresAt).getTime() <= Date.now() ||
        (share.protectedByCode && codes.get(share.shareId) !== body.code)
      )
        return fail('分享不存在、已失效或提取码不正确')
      const file = files.find((f) => f.fileId === share.fileId)
      if (!file) return fail('文件不存在')
      return action === 'info'
        ? result({ fileName: file.fileName, size: file.size })
        : new HttpResponse(blobs.get(file.fileId) ?? new Blob(['Development fixture']), {
            headers: {
              'Content-Disposition': 'attachment',
              'Content-Type': 'application/octet-stream',
            },
          })
    }),
  ),
  http.get('/api/v1/auth/account/api-keys', ({ request }) =>
    denied(request) ? fail('请先登录') : result(keys),
  ),
  http.post('/api/v1/auth/account/api-keys', async ({ request }) => {
    if (denied(request)) return fail('请先登录')
    const b = (await request.json()) as { name: string; scopes: string[]; days: number }
    const token = 'ynk_DEVELOPMENT_FIXTURE_ONLY',
      key: PersonalApiKey = {
        id: crypto.randomUUID(),
        name: b.name,
        prefix: token.slice(0, 12),
        scopes: b.scopes,
        createdAt: now(),
        expiresAt: new Date(Date.now() + b.days * 86400000).toISOString(),
        lastUsedAt: null,
        revoked: false,
      }
    keys.unshift(key)
    return result({ key, token })
  }),
  http.post('/api/v1/auth/account/api-keys/:id/revoke', ({ request, params }) => {
    if (denied(request)) return fail('请先登录')
    const k = keys.find((k) => k.id === params.id)
    if (!k) return fail('密钥不存在')
    k.revoked = true
    return result(null)
  }),
]
