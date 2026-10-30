import { workspaceHandlers } from './workspace'
import { pkceChallenge } from '../http/handoff'
import { http as mswHttp, HttpResponse, delay } from 'msw'
import type {
  AdminUserView,
  AuditLogView,
  BadgeDefinitionView,
  BadgeGrantPayload,
  BadgeGrantRecord,
  BadgeSavePayload,
  DeptTreeNode,
  DeptView,
  MenuTreeNode,
  MenuView,
  NoticeRecordView,
  NoticeSendPayload,
  NoticeTemplateSavePayload,
  NoticeTemplateView,
  OAuthAppAuditPayload,
  OAuthApplicationView,
  OAuthAppSavePayload,
  Result,
  RoleView,
  TokenResult,
  UserProfileUpdatePayload,
  UserTag,
  UserTagSavePayload,
} from '../types'
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
  DEFAULT_USER_ROLE_ID,
  mockAnalyticsProfiles,
  mockAppeals,
  mockAuditLogs,
  mockBadgeDefinitions,
  mockBadgeGrantRecords,
  mockCurrentUserRoles,
  mockDepts,
  mockFiles,
  mockFunnel,
  mockMenus,
  mockNotices,
  mockNoticeTemplates,
  mockOAuthApplications,
  mockPermissions,
  mockRetention,
  mockRoleDepts,
  mockRoleMenus,
  mockRolePermissions,
  mockRoles,
  mockSegment,
  mockUserBadges,
  mockUserProfiles,
  mockUserRoles,
  mockUsers,
  mockUserTags,
} from './data'

/**
 * MSW 请求处理器。
 *
 * 覆盖「登录 → 用户列表 / 申诉审核 / 角色 / 站内信 / 审计日志」等样板页所需接口，
 * 全部返回与后端一致的 `Result<T>` 结构，失败走同样的业务码。
 */

const LATENCY = 260

const registrationChallenges = new Map<string, { expires: number; purpose: string }>()
const emailCodeCooldown = new Map<string, number>()

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

function paged<T>(
  list: T[],
  query: URLSearchParams,
): { records: T[]; total: number; page: number; size: number } {
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const size = Math.min(100, Math.max(1, Number(query.get('size') ?? 20)))
  const start = (page - 1) * size
  return { records: list.slice(start, start + size), total: list.length, page, size }
}

/**
 * 管理端守卫。与后端一致：只认用户 JWT（Bearer，按 `admin` 角色放行）。
 */
function requireAdmin(request: Request): Response | null {
  const bearer = request.headers.get('Authorization')
  if (!bearer?.startsWith('Bearer ')) {
    return HttpResponse.json(
      {
        code: 30501,
        msg: '登录状态无效，请重新登录',
        tips: null,
        data: null,
        traceId: trace(),
        timestamp: Date.now(),
      },
      { status: 401 },
    )
  }
  return null
}

/** Mock 中固定的当前用户 ID（真实环境由网关注入 `X-User-Id`） */
const MOCK_CURRENT_USER_ID = 10001

/**
 * 终端用户守卫：与后端一致，缺少有效用户身份返回 `code=401`。
 */
function requireUser(request: Request): Response | null {
  const bearer = request.headers.get('Authorization')
  if (!bearer?.startsWith('Bearer ')) return fail(401, '缺少有效用户身份', 401)
  return null
}

const nowIso = () => new Date().toISOString().slice(0, 19)

/* --------------------------- 权限中心 · 树与主键工具 --------------------------- */

/** 由扁平菜单列表按 parentId 组装树；父节点不在集合内者视为根（与后端一致） */
function buildMenuTree(menus: MenuView[]): MenuTreeNode[] {
  const sorted = [...menus].sort((a, b) => a.sort - b.sort || a.id - b.id)
  const nodes = new Map<number, MenuTreeNode>()
  for (const menu of sorted) {
    nodes.set(menu.id, {
      id: menu.id,
      menuCode: menu.menuCode,
      menuName: menu.menuName,
      parentId: menu.parentId,
      path: menu.path,
      sort: menu.sort,
      children: [],
    })
  }
  const roots: MenuTreeNode[] = []
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** 由扁平部门列表按 parentId 组装树 */
function buildDeptTree(depts: DeptView[]): DeptTreeNode[] {
  const sorted = [...depts].sort((a, b) => a.sort - b.sort || a.id - b.id)
  const nodes = new Map<number, DeptTreeNode>()
  for (const dept of sorted) {
    nodes.set(dept.id, {
      id: dept.id,
      deptCode: dept.deptCode,
      deptName: dept.deptName,
      parentId: dept.parentId,
      sort: dept.sort,
      status: dept.status,
      children: [],
    })
  }
  const roots: DeptTreeNode[] = []
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

const nextId = (items: { id: number }[]): number =>
  items.reduce((max, item) => Math.max(max, item.id), 0) + 1

/* --------------------------- 通知中心 · 工具 --------------------------- */

/** 通道中文名（与后端 `channelLabel` 一致） */
const CHANNEL_LABEL: Record<number, string> = { 1: '站内信', 2: '邮件', 3: '短信' }

/** 渲染模板占位符 `${key}`；缺失参数保持原样 */
function renderTemplate(text: string, params?: Record<string, string>): string {
  if (!params) return text
  return text.replace(/\$\{(\w+)\}/g, (raw, key: string) => params[key] ?? raw)
}

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
  return [...portalPages].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.recordId - b.recordId,
  )
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
  ...workspaceHandlers,
  /* ------------------------------ 认证中心 · 终端用户 ------------------------------ */

  mswHttp.get('/api/v1/auth/captcha', async ({ request }) => {
    await delay(LATENCY)
    const username = new URL(request.url).searchParams.get('username') ?? ''
    return HttpResponse.json(
      ok({ captchaId: `cap-${username || 'anon'}-${Date.now()}`, code: '123456' }),
    )
  }),

  mswHttp.post('/api/v1/auth/login', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as {
      username?: string
      password?: string
      clientCode?: string
    }
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

  mswHttp.get('/api/v1/auth/account/oauth-consent', async ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(
      ok({
        clientId: url.searchParams.get('clientCode'),
        appName: 'OAuth 接入演示',
        description: '演示应用授权信息',
        websiteUrl: 'https://example.com',
        scopes: ['profile:read', 'files:read'],
        redirectUri: url.searchParams.get('redirectUri'),
      }),
    )
  }),
  mswHttp.post('/api/v1/auth/account/oauth-consent', async () =>
    fail(400, 'Mock 预览不签发真实授权码', 400),
  ),
  mswHttp.post('/api/v1/auth/sso/authorize', async ({ request }) => {
    const rejected = requireAdmin(request)
    if (rejected) return rejected
    const body = (await request.json()) as {
      state: string
      codeChallenge: string
      redirectUri: string
      clientCode: string
    }
    if (body.clientCode !== 'web' || !/^[A-Za-z0-9_-]{43}$/.test(body.codeChallenge))
      return fail(400, '授权请求无效', 400)
    // 两端 Mock 运行在不同 origin；仅在开发模式用自描述的公开 challenge 模拟授权码。
    const code = btoa(
      JSON.stringify({
        challenge: body.codeChallenge,
        redirectUri: body.redirectUri,
        expiresAt: Date.now() + 60000,
        nonce: crypto.randomUUID(),
      }),
    )
    const url = new URL(body.redirectUri)
    url.searchParams.set('code', code)
    url.searchParams.set('state', body.state)
    return HttpResponse.json(ok({ redirectUrl: url.toString() }))
  }),

  mswHttp.post('/api/v1/auth/sso/token', async ({ request }) => {
    const body = (await request.json()) as {
      code: string
      codeVerifier: string
      redirectUri: string
      clientCode: string
    }
    let record: { challenge: string; redirectUri: string; expiresAt: number; nonce: string }
    try {
      record = JSON.parse(atob(body.code))
    } catch {
      return fail(401, '授权码无效', 401)
    }
    if (
      !record ||
      !record.nonce ||
      record.expiresAt < Date.now() ||
      record.challenge !== pkceChallenge(body.codeVerifier) ||
      record.redirectUri !== body.redirectUri ||
      body.clientCode !== 'web' ||
      sessionStorage.getItem('yuna.mock.sso.used.' + record.nonce)
    )
      return fail(401, '授权码无效', 401)
    sessionStorage.setItem('yuna.mock.sso.used.' + record.nonce, '1')
    return HttpResponse.json(
      ok({
        accessToken: `mock.access.${crypto.randomUUID()}`,
        refreshToken: `mock.refresh.${crypto.randomUUID()}`,
        expiresIn: 1800,
        externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
      }),
    )
  }),

  mswHttp.post('/api/v1/auth/email-code', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { email?: string; purpose?: string }
    const purpose = body.purpose === undefined ? 'REGISTER' : body.purpose
    if (purpose !== 'REGISTER' && purpose !== 'LOGIN') return fail(400, '验证码用途无效', 400)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (email.length > 128 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return HttpResponse.json(ok(false))
    if ((emailCodeCooldown.get(email) ?? 0) > Date.now()) return HttpResponse.json(ok(false))
    emailCodeCooldown.set(email, Date.now() + 60000)
    registrationChallenges.set(`${purpose}:${email}`, { expires: Date.now() + 600000, purpose })
    return HttpResponse.json(ok(true))
  }),

  mswHttp.post('/api/v1/auth/register', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as {
      username?: string
      password?: string
      email?: string
      emailCode?: string
      mobile?: string
      mobileCountry?: string
    }
    // 手机号功能当前关闭：携带任一手机号字段一律拒绝（与后端一致）
    if (body.mobile || body.mobileCountry) return fail(30404, '手机号功能暂未开放', 400)
    const username = (body.username ?? '').trim()
    if (!username || !body.password) return fail(30403, '注册失败，请稍后重试', 503)
    const email = (body.email ?? '').trim().toLowerCase()
    if (email.length > 128 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return fail(400, '请输入有效邮箱', 400)
    if (mockUsers.some((u) => u.username === username || u.email?.toLowerCase() === email))
      return fail(30401, '账号或邮箱已存在', 409)
    const challenge = registrationChallenges.get(`REGISTER:${email}`)
    if (!challenge || challenge.expires <= Date.now() || body.emailCode !== '123456')
      return fail(400, '验证码无效或已过期', 400)
    registrationChallenges.delete(`REGISTER:${email}`)

    const externalId = `mock-ext-${Math.random().toString(36).slice(2, 12)}`
    const userId = Math.max(...mockUsers.map((u) => u.userId)) + 1
    mockUsers.unshift({
      userId,
      externalId,
      username,
      email,
      mobileCountry: null,
      mobile: null,
      status: 1,
      lockedUntil: null,
      lockReason: null,
      failCount: 0,
      lastLoginTime: null,
      lastLoginIp: null,
      createTime: nowIso(),
      updateTime: nowIso(),
    })
    // 新注册用户默认绑定「普通用户」角色
    mockUserRoles[userId] = [DEFAULT_USER_ROLE_ID]
    return HttpResponse.json(ok(externalId, '注册成功'))
  }),

  mswHttp.post('/api/v1/auth/unlock-appeal', async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as {
      username?: string
      password?: string
      appealReason?: string
      contact?: string
    }
    const username = (body.username ?? '').trim()
    if (!username || !body.password) return fail(30001, '账号或密码错误', 401)
    if (mockAppeals.some((a) => a.username === username && a.status === 0)) {
      return fail(30301, '已有待处理的申诉', 409)
    }
    const user = mockUsers.find((u) => u.username === username)
    mockAppeals.unshift({
      id: Math.max(...mockAppeals.map((a) => a.id), 2000) + 1,
      userId: user?.userId ?? null,
      username,
      appealReason: (body.appealReason ?? '').trim() || '（未填写申诉原因）',
      contact: body.contact?.trim() || null,
      status: 0,
      auditor: null,
      auditRemark: null,
      auditTime: null,
      createTime: nowIso(),
      updateTime: nowIso(),
    })
    return HttpResponse.json(ok(null, '申诉已提交'))
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
      ok({
        externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
        clientCode: 'user',
        nickname: '演示用户',
      }),
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
    const roleId = query.get('roleId'),
      permissionId = query.get('permissionId')
    if (roleId || permissionId)
      list = list.filter((user) => {
        const roles = (mockUserRoles[user.userId] ?? []).filter((id) =>
          mockRoles.some((role) => role.id === id && role.status === 1),
        )
        return (
          (!roleId || roles.includes(Number(roleId))) &&
          (!permissionId ||
            (mockPermissions.some((p) => p.id === Number(permissionId) && p.status === 1) &&
              roles.some((id) => (mockRolePermissions[id] ?? []).includes(Number(permissionId)))))
        )
      })
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
    const list =
      status !== null && status !== ''
        ? mockAppeals.filter((a) => String(a.status) === status)
        : mockAppeals
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
    appeal.auditRemark =
      body.remark ?? (params.action === 'approve' ? '人工复核通过' : '未通过身份核验')
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
    const roleIds = mockCurrentUserRoles.map((role) => role.id)
    const enabledRoleIds = mockRoles
      .filter((role) => roleIds.includes(role.id) && role.status === 1)
      .map((r) => r.id)
    // 权限为各启用角色的权限并集（与后端一致：去重升序）
    const permissionIds = new Set(enabledRoleIds.flatMap((id) => mockRolePermissions[id] ?? []))
    const permissions = mockPermissions
      .filter((item) => item.status === 1 && permissionIds.has(item.id))
      .map((item) => item.permCode)
      .sort()
    const menuIds = enabledRoleIds.flatMap((id) => mockRoleMenus[id] ?? [])
    const visibleMenus = mockMenus.filter((menu) => menuIds.includes(menu.id) && menu.status === 1)
    return HttpResponse.json(
      ok({
        userId: MOCK_CURRENT_USER_ID,
        roles: mockCurrentUserRoles,
        permissions,
        menus: buildMenuTree(visibleMenus),
      }),
    )
  }),

  /* ---------------------------- 权限中心 · 角色 ---------------------------- */

  mswHttp.get('/api/v1/permission/admin/roles/delegation', async () =>
    HttpResponse.json(ok({ unrestricted: true, permissionIds: [], dataScopes: [1, 2, 3, 4, 5] })),
  ),
  mswHttp.get('/api/v1/permission/admin/roles', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRoles))
  }),

  mswHttp.get('/api/v1/permission/admin/roles/:roleId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const role = mockRoles.find((item) => item.id === Number(params.roleId))
    if (!role) return fail(40001, '角色不存在', 404)
    return HttpResponse.json(ok(role))
  }),

  mswHttp.post('/api/v1/permission/admin/roles', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as {
      roleCode: string
      roleName: string
      description?: string
      dataScope?: number
      status?: number
    }
    if (mockRoles.some((role) => role.roleCode === body.roleCode))
      return fail(40002, '角色标识已存在', 409)
    const role = {
      id: nextId(mockRoles),
      roleCode: body.roleCode,
      roleName: body.roleName,
      description: body.description ?? null,
      dataScope: (body.dataScope ?? 4) as RoleView['dataScope'],
      status: body.status ?? 1,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockRoles.push(role)
    return HttpResponse.json(ok(role, '角色已创建'))
  }),

  mswHttp.post('/api/v1/permission/admin/roles/:roleId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const role = mockRoles.find((item) => item.id === Number(params.roleId))
    if (!role) return fail(40001, '角色不存在', 404)
    const body = (await request.json()) as {
      roleName: string
      description?: string
      dataScope?: number
      status?: number
    }
    role.roleName = body.roleName
    role.description = body.description ?? null
    if (body.dataScope !== undefined) role.dataScope = body.dataScope as RoleView['dataScope']
    if (body.status !== undefined) role.status = body.status
    role.updateTime = nowIso()
    return HttpResponse.json(ok(role, '角色已更新'))
  }),

  mswHttp.delete('/api/v1/permission/admin/roles/:roleId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = mockRoles.findIndex((item) => item.id === Number(params.roleId))
    if (index < 0) return fail(40001, '角色不存在', 404)
    const [removed] = mockRoles.splice(index, 1)
    delete mockRolePermissions[removed.id]
    delete mockRoleMenus[removed.id]
    delete mockRoleDepts[removed.id]
    return HttpResponse.json(ok(null, '角色已删除'))
  }),

  /* --------------------------- 权限中心 · 绑定关系 --------------------------- */

  mswHttp.get('/api/v1/permission/admin/roles/:roleId/permissions', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRolePermissions[Number(params.roleId)] ?? []))
  }),

  mswHttp.post(
    '/api/v1/permission/admin/roles/:roleId/permissions',
    async ({ request, params }) => {
      await delay(LATENCY)
      const guard = requireAdmin(request)
      if (guard) return guard
      const body = (await request.json()) as { permissionIds?: number[] }
      mockRolePermissions[Number(params.roleId)] = body.permissionIds ?? []
      return HttpResponse.json(ok(null, '权限绑定已更新'))
    },
  ),

  mswHttp.get('/api/v1/permission/admin/roles/:roleId/menus', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRoleMenus[Number(params.roleId)] ?? []))
  }),

  mswHttp.post('/api/v1/permission/admin/roles/:roleId/menus', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as { menuIds?: number[] }
    mockRoleMenus[Number(params.roleId)] = body.menuIds ?? []
    return HttpResponse.json(ok(null, '菜单绑定已更新'))
  }),

  mswHttp.get('/api/v1/permission/admin/roles/:roleId/depts', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRoleDepts[Number(params.roleId)] ?? []))
  }),

  mswHttp.post('/api/v1/permission/admin/roles/:roleId/depts', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as { deptIds?: number[] }
    mockRoleDepts[Number(params.roleId)] = body.deptIds ?? []
    return HttpResponse.json(ok(null, '数据范围绑定已更新'))
  }),

  /* ---------------------------- 权限中心 · 权限点 ---------------------------- */

  mswHttp.get('/api/v1/permission/admin/permissions', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockPermissions))
  }),

  mswHttp.get('/api/v1/permission/admin/permissions/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const permission = mockPermissions.find((item) => item.id === Number(params.id))
    if (!permission) return fail(40101, '权限不存在', 404)
    return HttpResponse.json(ok(permission))
  }),

  mswHttp.post('/api/v1/permission/admin/permissions', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as {
      permCode: string
      resource: string
      action: string
      description?: string
      status?: number
    }
    if (mockPermissions.some((item) => item.permCode === body.permCode)) {
      return fail(40102, '权限标识已存在', 409)
    }
    const permission = {
      id: nextId(mockPermissions),
      permCode: body.permCode,
      resource: body.resource,
      action: body.action,
      description: body.description ?? null,
      status: body.status ?? 1,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockPermissions.push(permission)
    return HttpResponse.json(ok(permission, '权限已创建'))
  }),

  mswHttp.post('/api/v1/permission/admin/permissions/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const permission = mockPermissions.find((item) => item.id === Number(params.id))
    if (!permission) return fail(40101, '权限不存在', 404)
    const body = (await request.json()) as {
      resource: string
      action: string
      description?: string
      status?: number
    }
    permission.resource = body.resource
    permission.action = body.action
    permission.description = body.description ?? null
    if (body.status !== undefined) permission.status = body.status
    permission.updateTime = nowIso()
    return HttpResponse.json(ok(permission, '权限已更新'))
  }),

  mswHttp.delete('/api/v1/permission/admin/permissions/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = mockPermissions.findIndex((item) => item.id === Number(params.id))
    if (index < 0) return fail(40101, '权限不存在', 404)
    const [removed] = mockPermissions.splice(index, 1)
    for (const roleId of Object.keys(mockRolePermissions)) {
      mockRolePermissions[Number(roleId)] = mockRolePermissions[Number(roleId)].filter(
        (id) => id !== removed.id,
      )
    }
    return HttpResponse.json(ok(null, '权限已删除'))
  }),

  /* ---------------------------- 权限中心 · 菜单 ---------------------------- */

  mswHttp.get('/api/v1/permission/admin/menus', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok([...mockMenus].sort((a, b) => a.sort - b.sort || a.id - b.id)))
  }),

  mswHttp.get('/api/v1/permission/admin/menus/tree', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(buildMenuTree(mockMenus)))
  }),

  mswHttp.get('/api/v1/permission/admin/menus/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const menu = mockMenus.find((item) => item.id === Number(params.id))
    if (!menu) return fail(40701, '菜单不存在', 404)
    return HttpResponse.json(ok(menu))
  }),

  mswHttp.post('/api/v1/permission/admin/menus', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as {
      menuCode: string
      menuName: string
      parentId?: number
      path?: string
      sort?: number
      status?: number
    }
    if (mockMenus.some((item) => item.menuCode === body.menuCode))
      return fail(40702, '菜单编码已存在', 409)
    const parentId = body.parentId ?? 0
    if (parentId !== 0 && !mockMenus.some((item) => item.id === parentId))
      return fail(40701, '菜单不存在', 404)
    const menu: MenuView = {
      id: nextId(mockMenus),
      menuCode: body.menuCode,
      menuName: body.menuName,
      parentId,
      path: body.path ?? null,
      sort: body.sort ?? 0,
      status: body.status ?? 1,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockMenus.push(menu)
    return HttpResponse.json(ok(menu, '菜单已创建'))
  }),

  mswHttp.post('/api/v1/permission/admin/menus/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const menu = mockMenus.find((item) => item.id === Number(params.id))
    if (!menu) return fail(40701, '菜单不存在', 404)
    const body = (await request.json()) as {
      menuName: string
      path?: string
      sort?: number
      status?: number
    }
    menu.menuName = body.menuName
    menu.path = body.path ?? null
    if (body.sort !== undefined) menu.sort = body.sort
    if (body.status !== undefined) menu.status = body.status
    menu.updateTime = nowIso()
    return HttpResponse.json(ok(menu, '菜单已更新'))
  }),

  mswHttp.delete('/api/v1/permission/admin/menus/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const id = Number(params.id)
    const index = mockMenus.findIndex((item) => item.id === id)
    if (index < 0) return fail(40701, '菜单不存在', 404)
    if (mockMenus.some((item) => item.parentId === id))
      return fail(40703, '存在子菜单，无法删除', 409)
    mockMenus.splice(index, 1)
    for (const roleId of Object.keys(mockRoleMenus)) {
      mockRoleMenus[Number(roleId)] = mockRoleMenus[Number(roleId)].filter(
        (menuId) => menuId !== id,
      )
    }
    return HttpResponse.json(ok(null, '菜单已删除'))
  }),

  /* ---------------------------- 权限中心 · 部门 ---------------------------- */

  mswHttp.get('/api/v1/permission/admin/depts', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok([...mockDepts].sort((a, b) => a.sort - b.sort || a.id - b.id)))
  }),

  mswHttp.get('/api/v1/permission/admin/depts/tree', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(buildDeptTree(mockDepts)))
  }),

  mswHttp.get('/api/v1/permission/admin/depts/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const dept = mockDepts.find((item) => item.id === Number(params.id))
    if (!dept) return fail(40401, '部门不存在', 404)
    return HttpResponse.json(ok(dept))
  }),

  mswHttp.post('/api/v1/permission/admin/depts', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as {
      deptCode: string
      deptName: string
      parentId?: number
      sort?: number
      status?: number
    }
    if (mockDepts.some((item) => item.deptCode === body.deptCode))
      return fail(40402, '部门编码已存在', 409)
    const parentId = body.parentId ?? 0
    if (parentId !== 0 && !mockDepts.some((item) => item.id === parentId))
      return fail(40401, '部门不存在', 404)
    const dept: DeptView = {
      id: nextId(mockDepts),
      deptCode: body.deptCode,
      deptName: body.deptName,
      parentId,
      sort: body.sort ?? 0,
      status: body.status ?? 1,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockDepts.push(dept)
    return HttpResponse.json(ok(dept, '部门已创建'))
  }),

  mswHttp.post('/api/v1/permission/admin/depts/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const dept = mockDepts.find((item) => item.id === Number(params.id))
    if (!dept) return fail(40401, '部门不存在', 404)
    const body = (await request.json()) as { deptName: string; sort?: number; status?: number }
    dept.deptName = body.deptName
    if (body.sort !== undefined) dept.sort = body.sort
    if (body.status !== undefined) dept.status = body.status
    dept.updateTime = nowIso()
    return HttpResponse.json(ok(dept, '部门已更新'))
  }),

  mswHttp.delete('/api/v1/permission/admin/depts/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const id = Number(params.id)
    const index = mockDepts.findIndex((item) => item.id === id)
    if (index < 0) return fail(40401, '部门不存在', 404)
    if (mockDepts.some((item) => item.parentId === id))
      return fail(40403, '存在子部门，无法删除', 409)
    mockDepts.splice(index, 1)
    for (const roleId of Object.keys(mockRoleDepts)) {
      mockRoleDepts[Number(roleId)] = mockRoleDepts[Number(roleId)].filter(
        (deptId) => deptId !== id,
      )
    }
    return HttpResponse.json(ok(null, '部门已删除'))
  }),

  /* ---------------------------- 权限中心 · 用户角色 ---------------------------- */

  mswHttp.get('/api/v1/permission/admin/users/:userId/roles', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockUserRoles[Number(params.userId)] ?? []))
  }),

  mswHttp.post('/api/v1/permission/admin/users/:userId/roles', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as { roleIds?: number[] }
    mockUserRoles[Number(params.userId)] = body.roleIds ?? []
    return HttpResponse.json(ok(null, '用户角色已更新'))
  }),

  /* ------------------------------ 用户中心 · 自助资料 ------------------------------ */

  mswHttp.get('/api/v1/user/profile', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const profile = mockUserProfiles[MOCK_CURRENT_USER_ID]
    if (!profile) return fail(20001, '用户不存在', 404)
    return HttpResponse.json(ok(profile))
  }),

  mswHttp.put('/api/v1/user/profile', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const profile = mockUserProfiles[MOCK_CURRENT_USER_ID]
    if (!profile) return fail(20001, '用户不存在', 404)
    const body = (await request.json()) as UserProfileUpdatePayload
    // 手机号功能当前关闭：携带任一手机号字段一律拒绝（与后端一致）
    if (body.mobile != null || body.mobileCountry != null)
      return fail(30404, '手机号功能暂未开放', 400)
    // 与后端一致：仅更新非 null 字段
    if (body.nickname != null) profile.nickname = body.nickname
    if (body.avatar != null) profile.avatar = body.avatar
    if (body.email != null) profile.email = body.email
    profile.updateTime = nowIso()
    return HttpResponse.json(ok(profile, '资料已更新'))
  }),

  mswHttp.get('/api/v1/user/tags', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockUserTags[MOCK_CURRENT_USER_ID] ?? []))
  }),

  mswHttp.put('/api/v1/user/tags', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const body = (await request.json()) as UserTagSavePayload
    if (!Array.isArray(body.tags) || body.tags.length > 20)
      return fail(400, '最多保存 20 个标签', 400)
    if (
      body.tags.some(
        (tag) =>
          !tag?.tagCode?.trim() ||
          !tag?.tagName?.trim() ||
          tag.tagCode.length > 32 ||
          tag.tagName.length > 32 ||
          (tag.color?.length ?? 0) > 16,
      )
    )
      return fail(400, '标签格式不正确', 400)
    // 覆盖式：同一 tagCode 保留第一项，最多 20 个（与后端一致）
    const dedup = new Map<string, UserTag>()
    for (const tag of body.tags ?? []) {
      if (tag?.tagCode && !dedup.has(tag.tagCode)) dedup.set(tag.tagCode, tag)
    }
    const tags = [...dedup.values()]
    mockUserTags[MOCK_CURRENT_USER_ID] = tags
    return HttpResponse.json(ok(tags, '标签已保存'))
  }),

  mswHttp.get('/api/v1/user/badges', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const list = [...(mockUserBadges[MOCK_CURRENT_USER_ID] ?? [])].sort(
      (a, b) => Date.parse(b.grantedTime ?? '') - Date.parse(a.grantedTime ?? ''),
    )
    return HttpResponse.json(ok(list))
  }),

  /* ------------------------------ 徽章中心 · 管理后台 ------------------------------ */

  mswHttp.get('/api/v1/user/admin/badges', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const list = [...mockBadgeDefinitions].sort(
      (a, b) => a.badgeLevel - b.badgeLevel || a.id - b.id,
    )
    return HttpResponse.json(ok(list))
  }),

  mswHttp.get('/api/v1/user/admin/badges/records', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const badgeId = new URL(request.url).searchParams.get('badgeId')
    const list = [...mockBadgeGrantRecords]
      .filter((record) => (badgeId ? record.badgeId === Number(badgeId) : true))
      .sort((a, b) => Date.parse(b.grantedTime ?? '') - Date.parse(a.grantedTime ?? ''))
    return HttpResponse.json(ok(list))
  }),

  mswHttp.post('/api/v1/user/admin/badges', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as BadgeSavePayload
    if (mockBadgeDefinitions.some((badge) => badge.badgeCode === body.badgeCode)) {
      return fail(40301, '徽章编码已存在', 409)
    }
    const badge: BadgeDefinitionView = {
      id: nextId(mockBadgeDefinitions),
      badgeCode: body.badgeCode,
      badgeName: body.badgeName,
      badgeLevel: body.badgeLevel,
      description: body.description ?? null,
      icon: body.icon ?? null,
      grantType: body.grantType,
      condition: body.grantType === 'condition' ? (body.condition ?? null) : null,
      status: body.status,
      grantedCount: 0,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockBadgeDefinitions.push(badge)
    return HttpResponse.json(ok(badge, '徽章已创建'))
  }),

  mswHttp.post('/api/v1/user/admin/badges/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const badge = mockBadgeDefinitions.find((item) => item.id === Number(params.id))
    if (!badge) return fail(40302, '徽章不存在', 404)
    const body = (await request.json()) as BadgeSavePayload
    if (
      mockBadgeDefinitions.some((item) => item.badgeCode === body.badgeCode && item.id !== badge.id)
    ) {
      return fail(40301, '徽章编码已存在', 409)
    }
    badge.badgeCode = body.badgeCode
    badge.badgeName = body.badgeName
    badge.badgeLevel = body.badgeLevel
    badge.description = body.description ?? null
    badge.icon = body.icon ?? null
    badge.grantType = body.grantType
    badge.condition = body.grantType === 'condition' ? (body.condition ?? null) : null
    badge.status = body.status
    badge.updateTime = nowIso()
    return HttpResponse.json(ok(badge, '徽章已更新'))
  }),

  mswHttp.post('/api/v1/user/admin/badges/:id/grant', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const badge = mockBadgeDefinitions.find((item) => item.id === Number(params.id))
    if (!badge) return fail(40302, '徽章不存在', 404)
    const body = (await request.json()) as BadgeGrantPayload
    let seq = nextId(mockBadgeGrantRecords)
    let granted = 0
    for (const userId of body.userIds ?? []) {
      // 幂等：同一徽章不重复发放给同一用户
      if (
        mockBadgeGrantRecords.some(
          (record) => record.badgeId === badge.id && record.userId === userId,
        )
      ) {
        continue
      }
      seq += 1
      granted += 1
      const record: BadgeGrantRecord = {
        id: seq,
        badgeId: badge.id,
        badgeCode: badge.badgeCode,
        badgeName: badge.badgeName,
        userId,
        username: mockUsers.find((user) => user.userId === userId)?.username ?? `用户 ${userId}`,
        grantType: 'manual',
        grantedTime: nowIso(),
      }
      mockBadgeGrantRecords.unshift(record)
    }
    badge.grantedCount += granted
    badge.updateTime = nowIso()
    return HttpResponse.json(
      ok(null, granted > 0 ? `已发放给 ${granted} 位用户` : '所选用户均已持有该徽章'),
    )
  }),

  mswHttp.delete('/api/v1/user/admin/badges/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = mockBadgeDefinitions.findIndex((item) => item.id === Number(params.id))
    if (index < 0) return fail(40302, '徽章不存在', 404)
    mockBadgeDefinitions.splice(index, 1)
    return HttpResponse.json(ok(null, '徽章已删除'))
  }),

  /* ------------------------------ OAuth 接入应用 · 用户端 ------------------------------ */

  mswHttp.get('/api/v1/auth/account/oauth-apps', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const list = [...mockOAuthApplications]
      .filter((app) => app.ownerUserId === MOCK_CURRENT_USER_ID)
      .sort((a, b) => Date.parse(b.createTime ?? '') - Date.parse(a.createTime ?? ''))
      .map((app) => ({ ...app, clientSecret: null }))
    return HttpResponse.json(ok(list))
  }),

  mswHttp.post('/api/v1/auth/account/oauth-apps', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const body = (await request.json()) as OAuthAppSavePayload
    if (
      mockOAuthApplications.some(
        (app) => app.ownerUserId === MOCK_CURRENT_USER_ID && app.appName === body.appName,
      )
    ) {
      return fail(40701, '应用名称已存在', 409)
    }
    const app: OAuthApplicationView = {
      id: nextId(mockOAuthApplications),
      clientId: null,
      clientSecret: `ynk_secret_${Math.random().toString(16).slice(2, 14)}`,
      appName: body.appName,
      description: body.description ?? null,
      logo: body.logo ?? null,
      websiteUrl: body.websiteUrl ?? null,
      redirectUris: [...body.redirectUris],
      scopes: [...body.scopes],
      ownerUserId: MOCK_CURRENT_USER_ID,
      ownerName: mockUsers.find((user) => user.userId === MOCK_CURRENT_USER_ID)?.username ?? '我',
      status: 0,
      auditRemark: null,
      auditTime: null,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockOAuthApplications.push(app)
    return HttpResponse.json(ok(app, '已提交申请，等待审核'))
  }),

  mswHttp.post('/api/v1/auth/account/oauth-apps/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const app = mockOAuthApplications.find(
      (item) => item.id === Number(params.id) && item.ownerUserId === MOCK_CURRENT_USER_ID,
    )
    if (!app) return fail(40702, '应用不存在', 404)
    const body = (await request.json()) as OAuthAppSavePayload
    app.appName = body.appName
    app.description = body.description ?? null
    app.logo = body.logo ?? null
    app.websiteUrl = body.websiteUrl ?? null
    app.redirectUris = [...body.redirectUris]
    app.scopes = [...body.scopes]
    // 已通过 / 已驳回的应用修改后需重新审核
    if (app.status === 1 || app.status === 2) {
      app.status = 0
      app.auditRemark = null
      app.auditTime = null
    }
    app.updateTime = nowIso()
    app.clientSecret = null
    return HttpResponse.json(ok(app, '已更新，等待审核'))
  }),

  mswHttp.post('/api/v1/auth/account/oauth-apps/:id/secret', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const app = mockOAuthApplications.find(
      (item) => item.id === Number(params.id) && item.ownerUserId === MOCK_CURRENT_USER_ID,
    )
    if (!app) return fail(40702, '应用不存在', 404)
    if (app.status !== 1) return fail(40703, '应用未通过审核，无法重置密钥', 409)
    app.clientSecret = `ynk_secret_${Math.random().toString(16).slice(2, 14)}`
    app.updateTime = nowIso()
    return HttpResponse.json(ok(app, '密钥已重置'))
  }),

  mswHttp.delete('/api/v1/auth/account/oauth-apps/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireUser(request)
    if (guard) return guard
    const index = mockOAuthApplications.findIndex(
      (item) => item.id === Number(params.id) && item.ownerUserId === MOCK_CURRENT_USER_ID,
    )
    if (index < 0) return fail(40702, '应用不存在', 404)
    mockOAuthApplications.splice(index, 1)
    return HttpResponse.json(ok(null, '应用已撤回'))
  }),

  /* ------------------------------ OAuth 接入应用 · 管理端 ------------------------------ */

  mswHttp.get('/api/v1/auth/admin/oauth-apps', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const status = new URL(request.url).searchParams.get('status')
    const filter = status !== null && status !== '' ? Number(status) : null
    const list = [...mockOAuthApplications]
      .filter((app) => (filter === null ? true : app.status === filter))
      .sort(
        (a, b) =>
          a.status - b.status || Date.parse(b.createTime ?? '') - Date.parse(a.createTime ?? ''),
      )
      .map((app) => ({ ...app, clientSecret: null }))
    return HttpResponse.json(ok(list))
  }),

  mswHttp.post('/api/v1/auth/admin/oauth-apps/:id/audit', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const app = mockOAuthApplications.find((item) => item.id === Number(params.id))
    if (!app) return fail(40702, '应用不存在', 404)
    const body = (await request.json()) as OAuthAppAuditPayload
    if (body.approved) {
      app.status = 1
      app.clientId = app.clientId ?? `ynk_app_${Math.random().toString(16).slice(2, 12)}`
    } else {
      app.status = 2
    }
    app.auditRemark = body.auditRemark ?? null
    app.auditTime = nowIso()
    app.updateTime = nowIso()
    return HttpResponse.json(
      ok({ ...app, clientSecret: null }, body.approved ? '审核已通过' : '已驳回'),
    )
  }),

  mswHttp.post('/api/v1/auth/admin/oauth-apps/:id/status', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const app = mockOAuthApplications.find((item) => item.id === Number(params.id))
    if (!app) return fail(40702, '应用不存在', 404)
    const body = (await request.json()) as { status: number }
    app.status = body.status as OAuthApplicationView['status']
    app.updateTime = nowIso()
    return HttpResponse.json(ok(null, body.status === 1 ? '应用已启用' : '应用已停用'))
  }),

  mswHttp.delete('/api/v1/auth/admin/oauth-apps/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = mockOAuthApplications.findIndex((item) => item.id === Number(params.id))
    if (index < 0) return fail(40702, '应用不存在', 404)
    mockOAuthApplications.splice(index, 1)
    return HttpResponse.json(ok(null, '应用已删除'))
  }),

  /* ------------------------------ 通知中心 · 站内信 ------------------------------ */

  mswHttp.get('/api/v1/notice/inbox/summary', () => {
    const visible = mockNotices.filter((n) => n.channel === 1 && (n.status === 1 || n.status === 3))
    return HttpResponse.json(
      ok({ total: visible.length, unread: visible.filter((n) => n.status === 1).length }),
    )
  }),
  mswHttp.post('/api/v1/notice/read/all', async () => {
    await delay(120)
    const unread = mockNotices.filter((n) => n.channel === 1 && n.status === 1)
    unread.forEach((n) => (n.status = 3))
    return HttpResponse.json(ok({ changed: unread.length }))
  }),
  mswHttp.get('/api/v1/notice/inbox/:noticeId', ({ params }) => {
    const record = mockNotices.find(
      (item) =>
        item.noticeId === Number(params.noticeId) &&
        item.channel === 1 &&
        (item.status === 1 || item.status === 3),
    )
    return record ? HttpResponse.json(ok(record)) : fail(60103, '通知不存在', 404)
  }),

  mswHttp.get('/api/v1/notice/inbox', async ({ request }) => {
    await delay(LATENCY)
    const query = new URL(request.url).searchParams
    // 与后端一致：仅 channel=1 且状态为「已发送 / 已读」的记录
    const visible = mockNotices.filter(
      (n) =>
        n.channel === 1 &&
        (n.status === 1 || n.status === 3) &&
        (!query.has('status') || n.status === Number(query.get('status'))),
    )
    return HttpResponse.json(ok(paged(visible, query)))
  }),

  mswHttp.post('/api/v1/notice/read/:noticeId', async ({ params }) => {
    await delay(120)
    const notice = mockNotices.find((n) => n.noticeId === Number(params.noticeId))
    if (!notice || notice.channel !== 1 || ![1, 3].includes(notice.status))
      return fail(60103, '通知记录不存在或不可操作')
    notice.status = 3
    return HttpResponse.json(ok(null))
  }),

  /* ------------------------------ 通知中心 · 模板管理 ------------------------------ */

  mswHttp.get('/api/v1/notice/template/list', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const query = new URL(request.url).searchParams
    const keyword = (query.get('keyword') ?? '').trim().toLowerCase()
    let list = [...mockNoticeTemplates].sort((a, b) => b.id - a.id)
    if (keyword) {
      list = list.filter(
        (t) =>
          t.templateCode.toLowerCase().includes(keyword) ||
          t.templateName.toLowerCase().includes(keyword),
      )
    }
    return HttpResponse.json(ok(paged(list, query)))
  }),

  mswHttp.get('/api/v1/notice/template/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const template = mockNoticeTemplates.find((t) => t.id === Number(params.id))
    if (!template) return fail(60101, '通知模板不存在', 404)
    return HttpResponse.json(ok(template))
  }),

  mswHttp.post('/api/v1/notice/template', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as NoticeTemplateSavePayload
    if (mockNoticeTemplates.some((t) => t.templateCode === body.templateCode)) {
      return fail(60102, '模板编码已存在', 409)
    }
    const template: NoticeTemplateView = {
      id: nextId(mockNoticeTemplates),
      templateCode: body.templateCode,
      templateName: body.templateName,
      channel: body.channel,
      channelLabel: CHANNEL_LABEL[body.channel] ?? null,
      title: body.title,
      content: body.content,
      status: 1,
      remark: body.remark ?? null,
      createTime: nowIso(),
      updateTime: nowIso(),
    }
    mockNoticeTemplates.push(template)
    return HttpResponse.json(ok(template, '模板已创建'))
  }),

  mswHttp.put('/api/v1/notice/template/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const template = mockNoticeTemplates.find((t) => t.id === Number(params.id))
    if (!template) return fail(60101, '通知模板不存在', 404)
    const body = (await request.json()) as NoticeTemplateSavePayload
    if (
      mockNoticeTemplates.some((t) => t.templateCode === body.templateCode && t.id !== template.id)
    ) {
      return fail(60102, '模板编码已存在', 409)
    }
    template.templateCode = body.templateCode
    template.templateName = body.templateName
    template.channel = body.channel
    template.channelLabel = CHANNEL_LABEL[body.channel] ?? null
    template.title = body.title
    template.content = body.content
    template.remark = body.remark ?? null
    template.updateTime = nowIso()
    return HttpResponse.json(ok(template, '模板已更新'))
  }),

  mswHttp.post('/api/v1/notice/template/:id/status', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const template = mockNoticeTemplates.find((t) => t.id === Number(params.id))
    if (!template) return fail(60101, '通知模板不存在', 404)
    const status = Number(new URL(request.url).searchParams.get('status') ?? 1)
    template.status = status === 1 ? 1 : 0
    template.updateTime = nowIso()
    return HttpResponse.json(ok(null, template.status === 1 ? '模板已启用' : '模板已停用'))
  }),

  mswHttp.delete('/api/v1/notice/template/:id', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const index = mockNoticeTemplates.findIndex((t) => t.id === Number(params.id))
    if (index < 0) return fail(60101, '通知模板不存在', 404)
    mockNoticeTemplates.splice(index, 1)
    return HttpResponse.json(ok(null, '模板已删除'))
  }),

  /* ------------------------------ 通知中心 · 发送 / 记录 ------------------------------ */

  mswHttp.post('/api/v1/notice/send', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const body = (await request.json()) as NoticeSendPayload
    const template = mockNoticeTemplates.find((t) => t.templateCode === body.templateCode)
    if (!template) return fail(60101, '通知模板不存在', 404)
    const channel = body.channel ?? template.channel
    const pending = (body.delayLevel ?? 0) > 0
    let seqId = nextId(mockNotices)
    let seqNotice = mockNotices.reduce((max, n) => Math.max(max, n.noticeId), 900000)
    const created = body.receivers.map((receiver) => {
      seqId += 1
      seqNotice += 1
      const record: NoticeRecordView = {
        id: seqId,
        noticeId: seqNotice,
        templateCode: template.templateCode,
        channel,
        channelLabel: CHANNEL_LABEL[channel] ?? null,
        receiver,
        title: renderTemplate(template.title, body.params),
        content: renderTemplate(template.content, body.params),
        params: body.params ? JSON.stringify(body.params) : null,
        status: pending ? 0 : 1,
        retryCount: 0,
        sendTime: pending ? null : nowIso(),
        errorMsg: null,
        createTime: nowIso(),
      }
      mockNotices.unshift(record)
      return record
    })
    return HttpResponse.json(ok(created, `已提交 ${created.length} 条通知`))
  }),

  mswHttp.get('/api/v1/notice/record/list', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const query = new URL(request.url).searchParams
    const templateCode = (query.get('templateCode') ?? '').trim()
    const receiver = (query.get('receiver') ?? '').trim()
    const status = query.get('status')
    let list = [...mockNotices].sort(
      (a, b) => Date.parse(b.createTime ?? '') - Date.parse(a.createTime ?? ''),
    )
    if (templateCode) list = list.filter((n) => (n.templateCode ?? '').includes(templateCode))
    if (receiver) list = list.filter((n) => (n.receiver ?? '').includes(receiver))
    if (status !== null && status !== '') list = list.filter((n) => String(n.status) === status)
    return HttpResponse.json(ok(paged(list, query)))
  }),

  mswHttp.get('/api/v1/notice/record/:noticeId', async ({ request, params }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const record = mockNotices.find((n) => n.noticeId === Number(params.noticeId))
    if (!record) return fail(60103, '通知记录不存在', 404)
    return HttpResponse.json(ok(record))
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
    if (portalPages.some((page) => page.id === body.id))
      return fail(60203, '门户页面标识已存在', 409)
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
    if (
      portalPages.some(
        (item) => normalizePath(item.path) === path && item.recordId !== page.recordId,
      )
    ) {
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

  /* ---------------------------- 行为分析（契约 §8.2） ---------------------------- */

  // 漏斗分析
  mswHttp.get('/api/v1/analytics/funnel', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockFunnel))
  }),

  // 留存分析
  mswHttp.get('/api/v1/analytics/retention', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockRetention))
  }),

  // 用户分群
  mswHttp.get('/api/v1/analytics/segments', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    return HttpResponse.json(ok(mockSegment))
  }),

  // 单用户画像
  mswHttp.get('/api/v1/analytics/profile', async ({ request }) => {
    await delay(LATENCY)
    const guard = requireAdmin(request)
    if (guard) return guard
    const userId = Number(new URL(request.url).searchParams.get('userId') ?? 0)
    const profile = mockAnalyticsProfiles[userId] ?? {
      userId,
      tags: [],
      eventCounts: {},
      valueTier: '未知',
    }
    return HttpResponse.json(ok(profile))
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
