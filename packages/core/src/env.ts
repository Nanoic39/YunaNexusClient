/**
 * 运行环境配置。
 *
 * 全部来源于 Vite 环境变量（`.env` / `.env.local`），并提供安全的默认值，
 * 使前端在「无网关、纯 Mock」状态下也能独立运行。
 */

/** 运行模式：开发（本地联调，可走 Mock） / 生产（必须对接真实数据） */
export type AppMode = 'development' | 'production'

export interface AppEnv {
  /** 当前生效的运行模式 */
  mode: AppMode
  /** 是否开发模式（`mode === 'development'`） */
  isDev: boolean
  /** 接口基础路径，默认空串（同源，交给 Vite 代理 / 网关） */
  apiBaseUrl: string
  /**
   * 是否启用 MSW Mock。
   * 仅开发模式可开启；生产模式恒为 `false`（禁止 Mock 兜底）。
   */
  enableMock: boolean
  /** 是否启用 CSRF 令牌回显 */
  enableCsrf: boolean
  /** 应用标题 */
  appTitle: string
  /**
   * 用户端访问地址（管理端顶栏「进入用户端」的跳转目标）。
   * 开发环境默认 localhost:5174；生产环境由 VITE_USER_URL 显式配置。
   */
  userAppUrl: string
  /**
   * 管理端访问地址（用户端顶栏「进入管理后台」的跳转目标）。
   * 开发环境默认 localhost:5173；生产环境由 VITE_ADMIN_URL 显式配置。
   */
  adminAppUrl: string
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true' || value === '1'
}

/** 环境变量表（内置声明，避免依赖全局类型，保证跨包编译上下文始终可用） */
interface EnvRecord {
  VITE_APP_ENV?: string
  VITE_API_BASE_URL?: string
  VITE_ENABLE_MOCK?: string
  VITE_ENABLE_CSRF?: string
  VITE_APP_TITLE?: string
  VITE_USER_URL?: string
  VITE_ADMIN_URL?: string
  /** Vite 内置：当前是否为开发模式 */
  PROD?: boolean
  DEV?: boolean
}

/** 解析运行模式：优先取 VITE_APP_ENV，缺省时按 Vite 的 DEV 标记推断 */
function resolveMode(raw: string | undefined, devFlag: boolean): AppMode {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'production') return 'production'
  if (value === 'development') return 'development'
  return devFlag ? 'development' : 'production'
}

/** 从 import.meta.env 读取环境配置 */
export function readEnv(): AppEnv {
  const env = (import.meta as unknown as { env?: EnvRecord }).env ?? ({} as EnvRecord)
  const mode = env.PROD === true ? 'production' : resolveMode(env.VITE_APP_ENV, env.DEV === true)
  const isDev = mode === 'development'
  return {
    mode,
    isDev,
    apiBaseUrl: env.VITE_API_BASE_URL ?? '',
    // 生产模式强制关闭 Mock（禁止兜底）；开发模式默认开启，可用 VITE_ENABLE_MOCK=false 关闭
    enableMock: isDev && readBool(env.VITE_ENABLE_MOCK, true),
    enableCsrf: readBool(env.VITE_ENABLE_CSRF, false),
    appTitle: env.VITE_APP_TITLE ?? 'YunaNexus',
    // 开发环境两端跑在 localhost 的不同端口；生产环境必须由环境变量显式指定
    userAppUrl: env.VITE_USER_URL || (isDev ? 'http://localhost:5174' : ''),
    adminAppUrl: env.VITE_ADMIN_URL || (isDev ? 'http://localhost:5173' : ''),
  }
}
