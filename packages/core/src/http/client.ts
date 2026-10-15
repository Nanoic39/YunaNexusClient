import { readEnv, type AppEnv } from '../env'
import { SUCCESS_CODE, type Result } from '../types'
import { cacheCsrf, readCsrfHeader } from './csrf'
import { ApiError, NetworkError } from './errors'
import { repairMojibakeDeep } from './mojibake'
import { refreshSession } from './refresh'
import { session } from './session'

/** 鉴权模式 */
export type AuthMode =
  /** 不携带任何鉴权信息（登录、验证码等匿名接口） */
  | 'none'
  /** 携带 Authorization: Bearer（终端用户） */
  | 'bearer'
  /**
   * 管理后台：携带用户 JWT（`Authorization: Bearer`）。
   * 与用户端共用同一账号体系（SSO），后端按 `admin` 角色放行管理台资源。
   */
  | 'admin'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestConfig {
  method?: HttpMethod
  /** 查询参数，undefined / null / '' 会被自动剔除 */
  query?: Record<string, QueryValue> | object
  /** 请求体，自动 JSON 序列化 */
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** 覆盖客户端的默认鉴权模式 */
  authMode?: AuthMode
  /** 是否为变更请求（决定是否附加 CSRF 头），默认由 method 推断 */
  mutate?: boolean
  /** 响应解析方式，默认 json */
  responseType?: 'json' | 'blob'
}

export interface HttpClientConfig {
  /** 接口基础路径 */
  baseUrl?: string
  /** 默认鉴权模式 */
  authMode?: AuthMode
  /** 是否对变更请求附加 CSRF 头 */
  csrf?: boolean
  /** 鉴权失效（401）回调，通常用于跳转登录 */
  onUnauthorized?: () => void
}

const MUTATING_METHODS: ReadonlySet<HttpMethod> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function buildQuery(query?: Record<string, QueryValue> | object): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function parseResult<T>(response: Response): Promise<Result<T>> {
  try {
    // 容错：后端字符集处理不当时可能返回「UTF-8 被按 cp1252 误解码」的乱码，此处只读还原
    return repairMojibakeDeep((await response.json()) as Result<T>)
  } catch (cause) {
    throw new NetworkError(`响应解析失败（HTTP ${response.status}）`, cause)
  }
}

/**
 * HTTP 客户端。
 *
 * 职责单一：拼接 URL / 注入鉴权与 CSRF / 解包 `Result<T>` / 把失败统一为 `ApiError`。
 * 不做业务语义判断，不吞异常。
 */
export class HttpClient {
  private readonly env: AppEnv
  private readonly config: Required<Omit<HttpClientConfig, 'onUnauthorized'>> &
    Pick<HttpClientConfig, 'onUnauthorized'>

  constructor(config: HttpClientConfig = {}) {
    this.env = readEnv()
    this.config = {
      baseUrl: config.baseUrl ?? this.env.apiBaseUrl,
      authMode: config.authMode ?? 'none',
      csrf: config.csrf ?? this.env.enableCsrf,
      onUnauthorized: config.onUnauthorized,
    }
  }

  /** 返回具备指定默认鉴权模式的新客户端 */
  withAuth(authMode: AuthMode): HttpClient {
    return new HttpClient({ ...this.config, authMode })
  }

  /** 发起请求并解包 `data` */
  async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const initialToken = session.state.accessToken
    const initialIdentity = session.state.externalId
    try {
      return await this.execute<T>(path, config)
    } catch (error) {
      const authMode = config.authMode ?? this.config.authMode
      if (error instanceof ApiError && error.isUnauthorized) {
        if (authMode !== 'none' && session.state.accessToken !== initialToken) {
          if (
            session.state.accessToken &&
            initialIdentity &&
            session.state.externalId === initialIdentity
          ) {
            return this.execute<T>(path, config)
          }
          throw error // 旧请求不能清除或代替另一个账号的新会话。
        }
        // 携令牌失效：先用 refreshToken 续期并重试一次（会话过期不该打断当前操作）
        if (authMode !== 'none' && session.state.accessToken && (await refreshSession())) {
          return this.execute<T>(path, config)
        }
        if (
          (authMode === 'bearer' || authMode === 'admin') &&
          session.state.accessToken === initialToken
        ) {
          session.clearUser()
          this.config.onUnauthorized?.()
        }
      }
      throw error
    }
  }

  /** 实际执行请求（`request` 在其上叠加续期重试） */
  private async execute<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const { method = 'GET', query, body, headers = {}, signal, responseType = 'json' } = config
    const authMode = config.authMode ?? this.config.authMode
    const mutate = config.mutate ?? MUTATING_METHODS.has(method)

    const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers }

    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = 'application/json'
    }

    if (authMode === 'bearer' && session.state.accessToken) {
      finalHeaders.Authorization = `Bearer ${session.state.accessToken}`
    }
    if (authMode === 'admin' && session.state.accessToken) {
      // 管理台与用户端共用用户 JWT；后端按 admin 角色放行
      finalHeaders.Authorization = `Bearer ${session.state.accessToken}`
    }

    if (mutate && this.config.csrf) {
      const csrfHeader = readCsrfHeader() ?? (await this.bootstrapCsrf())
      if (csrfHeader) finalHeaders[csrfHeader.name] = csrfHeader.value
    }

    const url = `${this.config.baseUrl}${path}${buildQuery(query)}`

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: finalHeaders,
        body:
          body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
        signal,
        credentials: 'include',
      })
    } catch (cause) {
      if (signal?.aborted) throw cause
      throw new NetworkError('网络请求失败，请检查网络或服务状态', cause)
    }

    if (responseType === 'blob') {
      if (!response.ok) throw await this.toApiError(response)
      if (
        response.headers.get('content-type')?.includes('application/json') &&
        !response.headers.get('content-disposition')?.includes('attachment')
      )
        throw await this.toApiError(response)
      return (await response.blob()) as T
    }

    const result = await parseResult<T>(response)

    if (result.code !== SUCCESS_CODE) {
      const error = new ApiError({
        code: result.code,
        message: result.msg || '请求失败',
        httpStatus: response.status,
        tips: result.tips,
        traceId: result.traceId,
      })
      throw error
    }

    return result.data
  }

  /** 把非 2xx 响应转为 ApiError（尽量读取业务码） */
  private async toApiError(response: Response): Promise<ApiError> {
    try {
      const result = (await response.json()) as Partial<Result<unknown>>
      return new ApiError({
        code: result.code ?? response.status,
        message: repairMojibakeDeep(result.msg) || `请求失败（HTTP ${response.status}）`,
        httpStatus: response.status,
        tips: result.tips ?? null,
        traceId: result.traceId ?? null,
      })
    } catch {
      return new ApiError({
        code: response.status,
        message: `请求失败（HTTP ${response.status}）`,
        httpStatus: response.status,
      })
    }
  }

  /** 拉取并缓存 CSRF 令牌（匿名，绕过拦截器避免递归） */
  private async bootstrapCsrf(): Promise<{ name: string; value: string } | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/v1/auth/csrf`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) return null
      const result = (await response.json()) as Result<{
        token: string
        headerName: string
      }>
      if (result.code !== SUCCESS_CODE || !result.data?.token) return null
      cacheCsrf({ token: result.data.token, headerName: result.data.headerName || 'X-XSRF-TOKEN' })
      return { name: result.data.headerName || 'X-XSRF-TOKEN', value: result.data.token }
    } catch {
      return null
    }
  }
}

/** 默认匿名客户端 */
export const http = new HttpClient({ authMode: 'none' })

/** 终端用户客户端（Bearer） */
export const userHttp = new HttpClient({ authMode: 'bearer' })

/** 管理后台客户端（用户 JWT，后端按 `admin` 角色放行） */
export const adminHttp = new HttpClient({ authMode: 'admin' })
