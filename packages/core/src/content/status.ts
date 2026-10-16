import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ContentElement, ContentItem, ContentItemStatus } from './types'

/**
 * 服务运行状态：把门户「服务状态图」对接到真实状态接口，渲染为
 * 类似 https://status.deepseek.com 的系统状态视图（整体横幅 + 各服务可用性条形图）。
 *
 * 支持两种取数方式（见 `ContentElement` / `ContentItem`）：
 * - 元素级聚合接口 `element.statusUrl`：一次拿到各服务状态与历史；
 * - 条目级独立地址 `item.statusUrl`：逐个服务各自查询。
 *
 * 约定响应体（与后端 `Result<T>` 兼容，也接受裸对象）：
 * ```json
 * {
 *   "status": "up",
 *   "services": [
 *     { "key": "svc-gateway", "status": "up", "availability": 99.92, "history": ["up", "up", "degraded"] }
 *   ]
 * }
 * ```
 * status ∈ up（运行中） / degraded（维护中） / down（故障） / planned（规划中，尚未参与）；
 * history 为按时间正序（旧 → 新）的每日状态序列，末位即当天。
 */

export type ServiceHealth = 'up' | 'degraded' | 'down' | 'planned' | 'unknown'

export interface ServiceStatusPeriod {
  startAt: string
  endAt: string
  status: ServiceHealth
  availability: number | null
  samples: number
}

/** 聚合响应中的单个服务条目，key / id / name 任一命中即可 */
export interface ServiceStatusEntry {
  key?: string
  id?: string
  name?: string
  status: ServiceHealth
  /** 可选：可用性百分比（如 99.92），缺省时由 history 推算 */
  availability?: number
  /** 可选：每日状态序列（旧 → 新），用于渲染条形图 */
  checkedAt?: string
  timeline?: ServiceStatusPeriod[]
  history?: ServiceHealth[]
}

export interface ServiceStatusPayload {
  status?: ServiceHealth
  services?: ServiceStatusEntry[]
  /** 单服务接口可直接在顶层返回 */
  availability?: number
  checkedAt?: string
  timeline?: ServiceStatusPeriod[]
  history?: ServiceHealth[]
}

/** 单个服务解析后的状态详情 */
export interface ServiceStatusDetail {
  health?: ServiceHealth
  availability?: number
  checkedAt?: string
  timeline?: ServiceStatusPeriod[]
  history?: ServiceHealth[]
}

const HEALTH_TO_ITEM: Record<ServiceHealth, ContentItemStatus> = {
  up: 'done',
  degraded: 'doing',
  down: 'todo',
  planned: 'todo',
  unknown: 'todo',
}

const ITEM_TO_HEALTH: Record<ContentItemStatus, ServiceHealth> = {
  done: 'up',
  doing: 'degraded',
  todo: 'planned',
}

export function isServiceHealth(value: unknown): value is ServiceHealth {
  return (
    value === 'up' ||
    value === 'degraded' ||
    value === 'down' ||
    value === 'planned' ||
    value === 'unknown'
  )
}

/** 状态接口语义 → 内容条目语义（复用 done / doing / todo 三态） */
export function healthToItemStatus(
  health: ServiceHealth | undefined,
): ContentItemStatus | undefined {
  return health ? HEALTH_TO_ITEM[health] : undefined
}

/** 内容条目静态值 → 状态接口语义（作为接口未配置 / 请求失败时的回退） */
export function itemStatusToHealth(
  status: ContentItemStatus | undefined,
): ServiceHealth | undefined {
  return status ? ITEM_TO_HEALTH[status] : undefined
}

export function serviceHealthText(health: ServiceHealth | undefined): string {
  if (health === 'up') return '运行中'
  if (health === 'degraded') return '维护中'
  if (health === 'down') return '故障'
  if (health === 'planned') return '规划中'
  return '未知'
}

/** 解包 `Result<T>`，兼容裸对象响应 */
function unwrap(payload: unknown): ServiceStatusPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if ('code' in record && 'data' in record) {
    const data = record.data
    return data && typeof data === 'object' ? (data as ServiceStatusPayload) : null
  }
  return record as ServiceStatusPayload
}

/** 过滤出合法状态序列，空序列视为未提供 */
function normalizeHistory(value: unknown): ServiceHealth[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.filter(isServiceHealth)
  return list.length ? list : undefined
}

function normalizeTimeline(value: unknown): ServiceStatusPeriod[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.filter(
    (v): v is ServiceStatusPeriod =>
      v &&
      typeof v.startAt === 'string' &&
      Number.isFinite(Date.parse(v.startAt)) &&
      typeof v.endAt === 'string' &&
      Date.parse(v.endAt) > Date.parse(v.startAt) &&
      isServiceHealth(v.status) &&
      Number.isInteger(v.samples) &&
      v.samples >= 0 &&
      (v.availability === null ||
        (typeof v.availability === 'number' &&
          Number.isFinite(v.availability) &&
          v.availability >= 0 &&
          v.availability <= 100)),
  )
  return list.length ? list.slice(-1440) : undefined
}

function normalizeAvailability(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

const REQUEST_TIMEOUT_MS = 8000

async function fetchStatus(url: string, signal: AbortSignal): Promise<ServiceStatusPayload | null> {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return unwrap(await response.json())
}

export interface UseServiceStatus {
  loading: Ref<boolean>
  error: Ref<string | null>
  /** 最近一次成功刷新时间戳 */
  lastUpdated: Ref<number | null>
  /** 立即刷新 */
  refresh: () => void
  /** 解析条目最终状态：接口优先，其次静态 status */
  detailOf: (item: ContentItem) => ServiceStatusDetail
}

/**
 * 服务状态轮询组合式。
 *
 * @param source 返回当前 services 元素的 getter（响应式）
 */
export function useServiceStatus(
  source: () => ContentElement | undefined,
  hours: () => number = () => 24,
): UseServiceStatus {
  function withPeriod(url: string): string {
    const target = new URL(url, window.location.href)
    target.searchParams.set('hours', String(hours()))
    return target.toString()
  }
  const details = reactive<Record<string, ServiceStatusDetail>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number | null>(null)

  let timer: ReturnType<typeof setInterval> | null = null
  let controller: AbortController | null = null

  function clearStatuses(): void {
    for (const key of Object.keys(details)) delete details[key]
    lastUpdated.value = null
    error.value = null
  }

  function stopTimer(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function applyAggregate(payload: ServiceStatusPayload, items: ContentItem[]): void {
    const overall = isServiceHealth(payload.status) ? payload.status : undefined
    const byKey = new Map<string, ServiceStatusEntry>()
    for (const entry of payload.services ?? []) {
      if (!isServiceHealth(entry.status)) continue
      for (const candidate of [entry.key, entry.id, entry.name]) {
        if (candidate) byKey.set(candidate, entry)
      }
    }
    for (const item of items) {
      const hit = byKey.get(item.id) ?? (item.title ? byKey.get(item.title) : undefined)
      if (hit) {
        details[item.id] = {
          health: hit.status,
          availability: normalizeAvailability(hit.availability),
          history: normalizeHistory(hit.history),
          timeline: normalizeTimeline(hit.timeline),
          checkedAt: hit.checkedAt,
        }
      } else if (overall) {
        details[item.id] = { health: overall }
      }
    }
  }

  async function fetchAggregate(
    url: string,
    items: ContentItem[],
    signal: AbortSignal,
  ): Promise<void> {
    const payload = await fetchStatus(withPeriod(url), signal)
    if (!payload) throw new Error('状态接口响应格式不正确')
    applyAggregate(payload, items)
  }

  async function fetchPerItem(items: ContentItem[], signal: AbortSignal): Promise<void> {
    const targets = items.filter((item) => item.statusUrl?.trim())
    if (!targets.length) return
    const results = await Promise.allSettled(
      targets.map(async (item) => {
        const payload = await fetchStatus(withPeriod((item.statusUrl as string).trim()), signal)
        if (!isServiceHealth(payload?.status)) throw new Error('状态字段缺失')
        details[item.id] = {
          health: payload.status,
          availability: normalizeAvailability(payload.availability),
          history: normalizeHistory(payload.history),
          timeline: normalizeTimeline(payload.timeline),
          checkedAt: payload.checkedAt,
        }
      }),
    )
    if (results.every((result) => result.status === 'rejected')) {
      throw new Error('全部服务状态接口请求失败')
    }
  }

  async function run(): Promise<void> {
    const element = source()
    if (!element || element.type !== 'services') return
    const items = element.items
    const aggregateUrl = element.statusUrl?.trim()
    const hasPerItem = items.some((item) => item.statusUrl?.trim())

    if (!aggregateUrl && !hasPerItem) {
      clearStatuses()
      return
    }

    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    const timeout = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS)
    loading.value = true

    try {
      if (aggregateUrl) await fetchAggregate(aggregateUrl, items, signal)
      else await fetchPerItem(items, signal)
      if (!signal.aborted) {
        error.value = null
        lastUpdated.value = Date.now()
      }
    } catch (cause) {
      if (!signal.aborted) {
        error.value = cause instanceof Error ? cause.message : String(cause)
      }
    } finally {
      clearTimeout(timeout)
      if (!signal.aborted) loading.value = false
    }
  }

  function setupTimer(seconds: number | undefined): void {
    stopTimer()
    const interval = Math.max(5, Number(seconds) || 30) * 1000
    timer = setInterval(() => void run(), interval)
  }

  /** 仅监听状态接口相关配置变化，避免编辑正文时反复请求 */
  const signature = computed(() => {
    const element = source()
    if (!element) return ''
    return [
      String(hours()),
      element.statusUrl ?? '',
      element.statusIntervalSeconds ?? '',
      element.items.map((item) => `${item.id}:${item.statusUrl ?? ''}`).join('|'),
    ].join('~')
  })

  watch(
    signature,
    () => {
      const element = source()
      clearStatuses()
      void run()
      setupTimer(element?.statusIntervalSeconds)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    stopTimer()
    controller?.abort()
  })

  return {
    loading,
    error,
    lastUpdated,
    refresh: () => void run(),
    detailOf: (item: ContentItem) =>
      details[item.id] ?? {
        health:
          source()?.statusUrl?.trim() || item.statusUrl?.trim()
            ? 'unknown'
            : itemStatusToHealth(item.status),
      },
  }
}
