import { computed, reactive } from 'vue'
import type { CurrentUserView, RoleBrief, TokenResult } from '../types'

/**
 * 会话状态（Token / 身份 / 权限）。
 *
 * 全站共用一套终端用户会话（`accessToken`，`Authorization: Bearer`）：
 * 用户端与管理端是同一账号体系（SSO），不存在独立的「管理端登录」。
 * 是否具备管理台访问资格由用户角色中是否含根角色 `admin` 决定。
 * 状态持久化到 localStorage，刷新页面不丢登录态。
 *
 * 用户端与管理端为不同域/端口部署时 localStorage 不共享，跨应用登录态通过
 * `exportHandoff` / `applyHandoff` 以 URL 片段形式接驳（见 `./handoff`）。
 */

/** 管理角色的根角色标识：持有该角色即视为具备管理后台访问资格 */
export const ADMIN_ROLE_CODE = 'admin'

export interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  /** accessToken 过期时间戳（epoch 毫秒） */
  expiresAt: number | null
  externalId: string | null
  /** 用户昵称（登录 / GET /me 回填，用于界面展示） */
  nickname: string | null
  clientCode: string | null
  /** 当前用户绑定的启用角色（`GET /permission/me` 回填） */
  roles: RoleBrief[]
  /** 当前用户权限码并集（`GET /permission/me` 回填） */
  permissions: string[]
}

const STORAGE_KEY = 'yuna.session'

const EMPTY: SessionState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  externalId: null,
  nickname: null,
  clientCode: null,
  roles: [],
  permissions: [],
}

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<SessionState>
    return { ...EMPTY, ...parsed }
  } catch {
    return { ...EMPTY }
  }
}

const state = reactive<SessionState>(load())

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 隐私模式 / 存储配额不足时静默降级为内存态 */
  }
}

/** 写入终端用户令牌 */
function setTokens(result: TokenResult, clientCode?: string): void {
  if (state.externalId !== result.externalId) {
    state.roles = []
    state.permissions = []
    state.nickname = null
  }
  state.accessToken = result.accessToken
  state.refreshToken = result.refreshToken
  state.expiresAt = Date.now() + result.expiresIn * 1000
  state.externalId = result.externalId
  if (result.nickname) state.nickname = result.nickname
  if (clientCode) state.clientCode = clientCode
  persist()
}

/** 写入身份信息（GET /me 回填） */
function setIdentity(externalId: string, clientCode: string, nickname?: string): void {
  state.externalId = externalId
  state.clientCode = clientCode
  if (nickname) state.nickname = nickname
  persist()
}

/** 写入当前用户权限视图（`GET /permission/me` 回填） */
function setCurrentUser(view: CurrentUserView): void {
  state.roles = view.roles ?? []
  state.permissions = view.permissions ?? []
  persist()
}

/** 是否持有指定角色 */
function hasRole(code: string): boolean {
  return state.roles.some((role) => role.roleCode === code)
}

/** 是否持有指定权限码 */
function hasPermission(code: string): boolean {
  return state.permissions.includes(code)
}

/** 清空终端用户令牌与权限视图 */
function clearUser(): void {
  state.accessToken = null
  state.refreshToken = null
  state.expiresAt = null
  state.externalId = null
  state.nickname = null
  state.clientCode = null
  state.roles = []
  state.permissions = []
  persist()
}

/** 清空全部会话 */
function clearAll(): void {
  Object.assign(state, EMPTY)
  persist()
}

export const session = {
  state,
  /** 终端用户是否已登录（未校验过期，过期由 401 兜底） */
  isAuthenticated: computed(() => Boolean(state.accessToken)),
  /** 是否具备管理后台访问资格（持有根角色 `admin`） */
  canEnterAdmin: computed(() => Boolean(state.accessToken) && state.roles.some((role) => role.roleCode === ADMIN_ROLE_CODE)),
  /** 管理端是否可直接进入（持有根角色 `admin`） */
  canAccessAdmin: computed(() => Boolean(state.accessToken) && state.roles.some((role) => role.roleCode === ADMIN_ROLE_CODE)),
  setTokens,
  setIdentity,
  setCurrentUser,
  hasRole,
  hasPermission,
  clearUser,
  clearAll,
}

export type Session = typeof session
