import { http as mswHttp, HttpResponse, delay } from 'msw'
import type { AdminUserView, AuditLogView, Result, TokenResult } from '../types'
import type { ServiceHealth } from '../content/status'
import { defaultContent } from '../content/defaults'
import type {
  PortalPageContent,
  PortalPageSaveRequest,
  PortalPageView,
  PortalSiteMeta,
  PortalSiteSaveRequest,
  PortalSiteView,
} from '../types/portal'
import {
  mockAppeals,
  mockAuditLogs,
  mockCurrentUserRoles,
  mockFiles,
  mockMenus,
  mockNotices,
  mockPermissions,
  mockRoles,
  mockUsers,
} from './data'

/**
 * MSW 请求处理器。
 *
 * 覆盖「登录 → 用户列表 / 申诉审核 / 角色 / 站内信 / 审计日志」等样板页所需接口，
 * 全部返回与后端一致的 `Result<T>` 结构，失败走同样的业务码。
 */

const LATENCY = 260

function ok<T>(data: T, msg = '操作成功'): Result<T> {
  return { code: 200, msg, tips: null, data, traceId: trace(), timestamp: Date.now() }
}

function fail(code: number, msg: string, httpStatus = 200): Response {
  const body: Result<null> = {
    code,
    msg,
    tips: null,
    data: null,
    traceId: trace(),
    timestamp: Date.now(),
  }
  return HttpResponse.json(body, { status: httpStatus })
}

function trace(): string {
  return Math.random().toString(16).slice(2).padEnd(24, '0')
}

function paged<T>(list: T[], query: URLSearchParams): { records: T[]; total: number; page: number; size: number } {
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const size = Math.min(100, Math.max(1, Number(query.get('size') ?? 20)))
  const start = (page - 1) * size
  return { records: list.slice(start, start + size), total: list.length, page, size }
}

function requireAdmin(request: Request): Response | null {
  const token = request.headers.get('X-Admin-Token')
  if (!token) {
    return HttpResponse.json(
      { code: 30501, msg: '管理员密钥无效', tips: null, data: null, traceId: trace(), timestamp: Date.now() },
      { status: 401 },
    )
  }
  return null
}

const nowIso = () => new Date().toISOString().slice(0, 19)

/* --------------------------- 门户内容 · 内存种子 --------------------------- */

/** 深拷贝纯 JSON 结构 */
function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 归一化路由路径：补前导斜杠、去尾部斜杠（与后端 / 前端 store 保持一致） */
function normalizePath(path: string): string {
  const trimmed = (path ?? '').trim()
  if (!trimmed || trimmed === '/') return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/'
}

/** 默认站点配置（内存态，管理端可改） */
const portalSite: PortalSiteView = {
  ...cloneValue(defaultContent.site),
  siteKey: 'default',
  status: 1,
  createTime: nowIso(),
  updateTime: nowIso(),
}

/** 页面主键自增序列 */
let portalRecordSeq = 0

/** 页面集合（内存态，管理端可改；seed 自内置默认内容） */
const portalPages: PortalPageView[] = defaultContent.pages.map((page, index) => {
  portalRecordSeq += 1
  return {
    ...cloneValue(page),
    recordId: portalRecordSeq,
    sortOrder: index,
    status: 1,
    createTime: nowIso(),
    updateTime: nowIso(),
  }
})

/** 按排序号升序（与后端 listPages 一致） */
function sortedPortalPages(): PortalPageView[] {
  return [...portalPages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.recordId - b.recordId)
}

/** 站点视图 → 公开元信息（仅内容字段） */
function toPortalSiteMeta(site: PortalSiteView): PortalSiteMeta {
  const { name, tagline, description, version, repositoryUrl, footerNote } = site
  return { name, tagline, description, version, repositoryUrl, footerNote }
}

/** 页面视图 → 公开内容（仅内容字段，剔除管理端元数据） */
function toPortalPageContent(page: PortalPageView): PortalPageContent {
  const { id, path, title, description, nav, sections } = page
  return { id, path, title, description, nav, sections: cloneValue(sections) }
}

export const handlers = [
  /* ------------------------------ 认证中心 · 终端用户 ------------------------------ */

  mswHttp.get('/api/v1/auth/captcha', async ({ request }) => {
    await delay(LATENCY)
    const username = new URL(request.url).searchParams.get('username') ?? ''
    return HttpResponse.json(ok({ captchaId: `cap-${username || 'anon'}-${Date.now()}`, code: '123456' }))
  }),

  mswHttp.post('/api/v1/auth/login', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { username?: string; password?: string; clientCode?: string }
    if (!body.username || !body.password) return fail(30001, '账号或密码错误', 401)
    if (body.password === 'wrong') return fail(30001, '账号或密码错误', 401)
    const data: TokenResult = {
      accessToken: `mock.access.${Date.now()}`,
      refreshToken: `mock.refresh.${Date.now()}`,
      expiresIn: 1800,
      externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
      nickname: body.username,
    }
    return HttpResponse.json(ok(data, '登录成功'))
  }),

  mswHttp.post('/api/v1/auth/logout', async () => {
    await delay(120)
    return HttpResponse.json(ok(null))
  }),

  mswHttp.post('/api/v1/auth/logout-all', async () => {
    await delay(120)
    return HttpResponse.json(ok(null))
  }),

  mswHttp.post('/api/v1/auth/refresh', async ({ request }) => {
    await delay(120)
    const body = (await request.json()) as { refreshToken?: string }
    if (!body.refreshToken) return fail(30011, '刷新令牌无效', 401)
    const data: TokenResult = {
      accessToken: `mock.access.${Date.now()}`,
      refreshToken: `mock.refresh.${Date.now()}`,
      expiresIn: 1800,
      externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
      nickname: '演示用户',
    }
    return HttpResponse.json(ok(data))
  }),

  mswHttp.get('/api/v1/auth/me', async ({ request }) => {
    await delay(120)
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return fail(30006, '未登录或登录已失效', 401)
    return HttpResponse.json(
      ok({ externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g', clientCode: 'user', nickname: '演示用户' }),
    )
  }),

  mswHttp.get('/api/v1/auth/csrf', async () => {
    await delay(60)
    return HttpResponse.json(
      ok({ token: `csrf-${Date.now()}`, headerName: 'X-XSRF-TOKEN', parameterName: '_csrf' }),
    )
  }),

  /* ------------------------------ 认证中心 · 管理后台 ------------------------------ */

  mswHttp.get('/api/v1/auth/admin/users', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const query = new URL(request.url).searchParams
    const keyword = (query.get('keyword') ?? '').trim().toLowerCase()
    const status = query.get('status')
    let list = mockUsers
    if (keyword) {
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(keyword) ||
          (u.email ?? '').toLowerCase().includes(keyword) ||
          (u.mobile ?? '').includes(keyword),
      )
    }
    if (status !== null && status !== '') list = list.filter((u) => String(u.status) === status)
    return HttpResponse.json(ok(paged(list, query)))
  }),

  mswHttp.get('/api/v1/auth/admin/users/:userId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const user = mockUsers.find((u) => u.userId === Number(params.userId))
    if (!user) return fail(30504, '用户不存在', 404)
    return HttpResponse.json(ok(user))
  }),

  mswHttp.post('/api/v1/auth/admin/users/:userId/:action', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const user = mockUsers.find((u) => u.userId === Number(params.userId))
    if (!user) return fail(30504, '用户不存在', 404)
    applyUserAction(user, String(params.action))
    return HttpResponse.json(ok(null, '操作成功'))
  }),

  mswHttp.get('/api/v1/auth/admin/appeals', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const query = new URL(request.url).searchParams
    const status = query.get('status')
    const list = status !== null && status !== '' ? mockAppeals.filter((a) => String(a.status) === status) : mockAppeals
    return HttpResponse.json(ok(paged(list, query)))
  }),

  mswHttp.get('/api/v1/auth/admin/appeals/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const appeal = mockAppeals.find((a) => a.id === Number(params.id))
    if (!appeal) return fail(30502, '申诉不存在', 404)
    return HttpResponse.json(ok(appeal))
  }),

  mswHttp.post('/api/v1/auth/admin/appeals/:id/:action', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const appeal = mockAppeals.find((a) => a.id === Number(params.id))
    if (!appeal) return fail(30502, '申诉不存在', 404)
    if (appeal.status !== 0) return fail(30503, '申诉已被审核', 409)
    const body = (await request.json().catch(() => ({}))) as { auditor?: string; remark?: string }
    appeal.status = params.action === 'approve' ? 1 : 2
    appeal.auditor = body.auditor ?? 'admin'
    appeal.auditRemark = body.remark ?? (params.action === 'approve' ? '人工复核通过' : '未通过身份核验')
    appeal.auditTime = nowIso()
    appeal.updateTime = nowIso()
    if (appeal.status === 1 && appeal.userId) {
      const user = mockUsers.find((u) => u.userId === appeal.userId)
      if (user) applyUserAction(user, 'unlock')
    }
    return HttpResponse.json(ok(null, '审核完成'))
  }),

  /* ------------------------------ 权限中心 ------------------------------ */

  // 对外：当前登录用户的身份 / 角色 / 权限 / 菜单（网关注入 X-User-Id，需 Bearer）
  mswHttp.get('/api/v1/permission/me', async ({ request }) => {
    await delay(LATENCY)
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return fail(30006, '未登录或登录已失效', 401)
    return HttpResponse.json(
      ok({
        userId: 10001,
        roles: mockCurrentUserRoles,
        permissions: mockPermissions.filter((item) => item.status === 1).map((item) => item.permCode),
        menus: mockMenus,
      }),
    )
  }),

  mswHttp.get('/api/v1/permission/admin/roles', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRoles))
  }),

  mswHttp.get('/api/v1/permission/admin/permissions', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockPermissions))
  }),

  mswHttp.get('/api/v1/permission/admin/menus/tree', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockMenus))
  }),

  /* ------------------------------ 通知中心 ------------------------------ */

  mswHttp.get('/api/v1/notice/inbox', async ({ request }) => {
    await delay(LATENCY)
    const query = new URL(request.url).searchParams
    return HttpResponse.json(ok(paged(mockNotices, query)))
  }),

  mswHttp.post('/api/v1/notice/read/:noticeId', async ({ params }) => {
    await delay(120)
    const notice = mockNotices.find((n) => n.noticeId === Number(params.noticeId))
    if (!notice) return fail(60103, '通知记录不存在或不可操作')
    notice.status = 3
    return HttpResponse.json(ok(null))
  }),

  /* ------------------------------ 审计中心 ------------------------------ */

  mswHttp.get('/api/v1/audit/logs', async ({ request }) => {
    await delay(LATENCY)
    const query = new URL(request.url).searchParams
    const userId = query.get('userId')
    const service = query.get('service')
    const startTime = query.get('startTime')
    const endTime = query.get('endTime')
    let list: AuditLogView[] = mockAuditLogs
    if (userId) list = list.filter((l) => String(l.userId) === userId)
    if (service) list = list.filter((l) => l.service === service)
    if (startTime) list = list.filter((l) => Date.parse(l.createTime) >= Number(startTime))
    if (endTime) list = list.filter((l) => Date.parse(l.createTime) <= Number(endTime))
    return HttpResponse.json(ok(paged(list, query)))
  }),

  /* ------------------------------ 文件中心 ------------------------------ */

  mswHttp.get('/api/v1/file/list', async ({ request }) => {
    await delay(LATENCY)
    const query = new URL(request.url).searchParams
    return HttpResponse.json(ok(paged(mockFiles, query)))
  }),

  /* ------------------------------ 门户内容（Notice · Portal） ------------------------------ */

  // 公开读：站点信息 + 全部已发布页面
  mswHttp.get('/api/v1/notice/portal/content', async () => {
    await delay(LATENCY)
    return HttpResponse.json(
      ok({
        site: toPortalSiteMeta(portalSite),
        pages: sortedPortalPages()
          .filter((page) => page.status === 1)
          .map(toPortalPageContent),
      }),
    )
  }),

  // 公开读：按路由路径读取单个已发布页面
  mswHttp.get('/api/v1/notice/portal/page', async ({ request }) => {
    await delay(LATENCY)
    const path = normalizePath(new URL(request.url).searchParams.get('path') ?? '')
    const page = portalPages.find((item) => normalizePath(item.path) === path && item.status === 1)
    if (!page) return fail(60202, '门户页面不存在', 404)
    return HttpResponse.json(ok(toPortalPageContent(page)))
  }),

  // 管理端：站点配置读取
  mswHttp.get('/api/v1/notice/portal/admin/site', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(portalSite))
  }),

  // 管理端：站点配置保存（整体覆盖）
  mswHttp.put('/api/v1/notice/portal/admin/site', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as PortalSiteSaveRequest
    portalSite.name = body.name
    portalSite.tagline = body.tagline ?? ''
    portalSite.description = body.description ?? ''
    portalSite.version = body.version ?? ''
    portalSite.repositoryUrl = body.repositoryUrl ?? ''
    portalSite.footerNote = body.footerNote ?? ''
    portalSite.updateTime = nowIso()
    return HttpResponse.json(ok(portalSite, '站点配置已保存'))
  }),

  // 管理端：页面列表（含草稿）
  mswHttp.get('/api/v1/notice/portal/admin/pages', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(sortedPortalPages()))
  }),

  // 管理端：新增页面
  mswHttp.post('/api/v1/notice/portal/admin/pages', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as PortalPageSaveRequest
    if (portalPages.some((page) => page.id === body.id)) return fail(60203, '门户页面标识已存在', 409)
    const path = normalizePath(body.path)
    if (portalPages.some((page) => normalizePath(page.path) === path)) {
      return fail(60204, '门户页面路径已存在', 409)
    }
    portalRecordSeq += 1
    const page: PortalPageView = {
      id: body.id,
      path,
      title: body.title,
      description: body.description ?? '',
      nav: Boolean(body.nav),
      sections: cloneValue(body.sections ?? []),
      recordId: portalRecordSeq,
      sortOrder: body.sortOrder ?? 0,
      status: body.status ?? 1,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    portalPages.push(page)
    return HttpResponse.json(ok(page, '页面已创建'))
  }),

  // 管理端：页面详情
  mswHttp.get('/api/v1/notice/portal/admin/pages/:recordId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const page = portalPages.find((item) => item.recordId === Number(params.recordId))
    if (!page) return fail(60202, '门户页面不存在', 404)
    return HttpResponse.json(ok(page))
  }),

  // 管理端：修改页面
  mswHttp.put('/api/v1/notice/portal/admin/pages/:recordId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const page = portalPages.find((item) => item.recordId === Number(params.recordId))
    if (!page) return fail(60202, '门户页面不存在', 404)
    const body = (await request.json()) as PortalPageSaveRequest
    if (portalPages.some((item) => item.id === body.id && item.recordId !== page.recordId)) {
      return fail(60203, '门户页面标识已存在', 409)
    }
    const path = normalizePath(body.path)
    if (portalPages.some((item) => normalizePath(item.path) === path && item.recordId !== page.recordId)) {
      return fail(60204, '门户页面路径已存在', 409)
    }
    page.id = body.id
    page.path = path
    page.title = body.title
    page.description = body.description ?? ''
    page.nav = Boolean(body.nav)
    page.sections = cloneValue(body.sections ?? [])
    page.sortOrder = body.sortOrder ?? 0
    page.status = body.status ?? 1
    page.updateTime = nowIso()
    return HttpResponse.json(ok(page, '页面已更新'))
  }),

  // 管理端：删除页面
  mswHttp.delete('/api/v1/notice/portal/admin/pages/:recordId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = portalPages.findIndex((item) => item.recordId === Number(params.recordId))
    if (index < 0) return fail(60202, '门户页面不存在', 404)
    portalPages.splice(index, 1)
    return HttpResponse.json(ok(null, '页面已删除'))
  }),

  /* ---------------------------- 服务运行状态（门户） ---------------------------- */

  // 聚合接口：一次返回各服务状态（key 对应门户条目 id）
  mswHttp.get('/api/v1/status', async () => {
    await delay(180)
    return HttpResponse.json(ok({ services: aggregateStatus() }))
  }),

  // 单服务接口：供条目级独立 statusUrl 使用
  mswHttp.get('/api/v1/status/:key', async ({ params }) => {
    await delay(160)
    const key = String(params.key)
    const history = historyFor(key)
    return HttpResponse.json(
      ok({ status: history[history.length - 1], availability: availabilityOf(key), history }),
    )
  }),
]

/** 各服务基线健康态（与门户默认条目 id 对应） */
const SERVICE_STATUS_BASE: Record<string, ServiceHealth> = {
  'svc-gateway': 'up',
  'svc-auth': 'up',
  'svc-user': 'up',
  'svc-permission': 'up',
  'svc-file': 'up',
  'svc-notice': 'up',
  'svc-audit': 'up',
  'svc-meta': 'degraded',
  'svc-analytics': 'planned',
}

/** 历史窗口天数（约 6 个月，供门户状态图区间翻页） */
const STATUS_HISTORY_DAYS = 180

/** 简易确定性随机（mulberry32）：保证同一服务每次加载历史一致 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedOf(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const statusHistoryCache = new Map<string, ServiceHealth[]>()

/** 服务每日状态序列（旧 → 新，末位即当天） */
function historyFor(key: string): ServiceHealth[] {
  const cached = statusHistoryCache.get(key)
  if (cached) return cached
  const base = SERVICE_STATUS_BASE[key] ?? 'up'
  const random = seededRandom(seedOf(key))
  const history: ServiceHealth[] = []
  for (let i = 0; i < STATUS_HISTORY_DAYS; i += 1) {
    const roll = random()
    if (base === 'up') {
      history.push(roll > 0.985 ? 'down' : roll > 0.94 ? 'degraded' : 'up')
    } else if (base === 'degraded') {
      history.push(roll > 0.6 ? 'up' : roll > 0.45 ? 'degraded' : 'down')
    } else if (base === 'planned') {
      history.push('planned')
    } else {
      history.push('down')
    }
  }
  history[history.length - 1] = base
  statusHistoryCache.set(key, history)
  return history
}

/** 可用性百分比；规划中的服务尚未参与，返回 undefined */
function availabilityOf(key: string): number | undefined {
  const history = historyFor(key)
  const days = history.filter((h) => h !== 'planned')
  if (!days.length) return undefined
  const score = days.reduce((sum, h) => sum + (h === 'up' ? 1 : h === 'degraded' ? 0.5 : 0), 0)
  return Number(((score / days.length) * 100).toFixed(2))
}

/** 聚合健康态列表（含可用性与历史） */
function aggregateStatus(): {
  key: string
  status: ServiceHealth
  availability?: number
  history: ServiceHealth[]
}[] {
  return Object.keys(SERVICE_STATUS_BASE).map((key) => {
    const history = historyFor(key)
    return { key, status: history[history.length - 1], availability: availabilityOf(key), history }
  })
}

/** 就地应用用户状态变更，保证列表刷新后状态一致 */
function applyUserAction(user: AdminUserView, action: string): void {
  const stamp = nowIso()
  switch (action) {
    case 'enable':
    case 'unlock':
      user.status = 1
      user.failCount = 0
      user.lockedUntil = null
      user.lockReason = null
      break
    case 'disable':
      user.status = 0
      break
    case 'kick':
      break
    default:
      break
  }
  user.updateTime = stamp
}

/** 便于测试与类型推导的导出 */
export type MockHandlers = typeof handlers
