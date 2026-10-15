import { computed, nextTick, reactive, watch } from 'vue'
import type { ContentPage, SiteContent, SiteMeta } from './types'
import { defaultContent } from './defaults'
import { portalAdminApi, portalApi } from '../api/portal'
import type { PortalPageSaveRequest, PortalPageView } from '../types/portal'

/**
 * 门户内容状态与持久化。
 *
 * 内容以后端门户接口为准（`/api/v1/notice/portal`），本地 localStorage 仅作为
 * 离线缓存与首屏兜底，内置 `defaultContent` 作为最终兜底：
 *
 * - 用户端（`loadPublic`）：只读拉取「站点 + 已发布页面」；接口不可用时沿用缓存 / 默认值。
 * - 管理端（`loadAdmin`）：拉取站点与全部页面（含草稿），编辑后**防抖**整体同步回后端
 *   （站点 PUT，页面按 `recordId` 增量 POST / PUT / DELETE）。
 *
 * 两端复用同一套 schema（页面 → 区块 → 元素 → 条目），管理端编辑结果即时反映到 `state`。
 */

const STORAGE_KEY = 'yuna.site-content'
/** 编辑后同步到后端的防抖时长（毫秒） */
const SYNC_DEBOUNCE_MS = 700

/** 深拷贝：内容为纯 JSON 结构，用序列化实现即可 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 归一化路由路径：补前导斜杠、去尾部斜杠 */
function normalizePath(path: string): string {
  const trimmed = (path ?? '').trim()
  if (!trimmed || trimmed === '/') return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/'
}

/** 读取本地缓存，缺失或非法时回退内置默认内容 */
function loadCache(): SiteContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(defaultContent)
    const parsed = JSON.parse(raw) as SiteContent
    if (!parsed || typeof parsed !== 'object' || !parsed.site || !Array.isArray(parsed.pages)) {
      return clone(defaultContent)
    }
    return parsed
  } catch {
    return clone(defaultContent)
  }
}

const state = reactive<SiteContent>(loadCache())

/** 内容来源与同步状态（供消费端展示） */
const meta = reactive({
  /** 当前内容来源：public（门户只读）/ admin（管理端可编辑） */
  mode: null as 'public' | 'admin' | null,
  /** 是否正在拉取后端内容 */
  loading: false,
  /** 是否正在同步编辑结果到后端 */
  syncing: false,
  /** 最近一次失败原因（拉取或同步） */
  error: null as string | null,
  /** 最近一次同步成功时间 */
  lastSyncedAt: null as number | null,
})

/** 页面业务标识 → 数据库主键，管理端增量同步（PUT / DELETE）定位用 */
const recordIds = new Map<string, number>()

/** 是否启用「变更 → 后端同步」；内容载入期间关闭，避免把载入动作误判为用户编辑 */
let syncEnabled = false
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncRunning = false
let syncQueued = false

function persistCache(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* 隐私模式 / 配额不足时静默降级为内存态 */
  }
}

watch(
  state,
  () => {
    persistCache()
    if (syncEnabled && meta.mode === 'admin') scheduleSync()
  },
  { deep: true },
)

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : '未知错误'
}

/* -------------------------------- 内容应用 -------------------------------- */

/** 覆盖站点元信息（后端字段可能缺省，做兜底归一） */
function applySite(site: Partial<SiteMeta>): void {
  state.site.name = site.name ?? state.site.name
  state.site.tagline = site.tagline ?? ''
  state.site.description = site.description ?? ''
  state.site.version = site.version ?? ''
  state.site.repositoryUrl = site.repositoryUrl ?? ''
  state.site.footerNote = site.footerNote ?? ''
}

/** 覆盖页面列表（仅保留内容字段，剔除管理端元数据） */
function applyPages(pages: ContentPage[]): void {
  const next = pages
    .filter((page) => page && page.id)
    .map((page) => ({
      id: page.id,
      path: page.path ?? '/',
      title: page.title ?? '',
      description: page.description ?? '',
      nav: Boolean(page.nav),
      sections: clone(page.sections ?? []),
    }))
  state.pages.splice(0, state.pages.length, ...next)
}

/* -------------------------------- 载入内容 -------------------------------- */

/** 用户端：拉取公开内容；失败时保留缓存 / 默认值，保证门户始终可访问 */
async function loadPublic(): Promise<void> {
  syncEnabled = false
  meta.mode = 'public'
  meta.loading = true
  try {
    const content = await portalApi.content()
    applySite(content.site ?? {})
    const pages = content.pages ?? []
    // 后端暂未配置页面时保留内置默认内容，避免门户空白
    if (pages.length) applyPages(pages)
    meta.error = null
  } catch (error) {
    meta.error = messageOf(error)
  } finally {
    meta.loading = false
    persistCache()
  }
}

/** 管理端：拉取站点与全部页面（含草稿），随后开启编辑自动同步 */
async function loadAdmin(): Promise<void> {
  syncEnabled = false
  meta.mode = 'admin'
  meta.loading = true
  try {
    const [site, pages] = await Promise.all([portalAdminApi.getSite(), portalAdminApi.listPages()])
    applySite(site as Partial<SiteMeta>)
    const list: PortalPageView[] = (pages ?? []).filter((page) => page && page.id)
    recordIds.clear()
    for (const page of list) recordIds.set(page.id, page.recordId)
    // 后端暂未配置页面时，以内置默认内容作为初始草稿，首次编辑即写入后端
    applyPages(list.length ? list : defaultContent.pages)
    meta.error = null
  } catch (error) {
    meta.error = messageOf(error)
  } finally {
    meta.loading = false
    persistCache()
    // 等待载入引发的 watch 回调先执行完，再开启同步，避免误写后端
    await nextTick()
    syncEnabled = true
  }
}

/* -------------------------------- 同步后端 -------------------------------- */

function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    void runSync()
  }, SYNC_DEBOUNCE_MS)
}

async function runSync(): Promise<void> {
  syncTimer = null
  if (syncRunning) {
    syncQueued = true
    return
  }
  syncRunning = true
  meta.syncing = true
  try {
    await syncToBackend()
    meta.error = null
    meta.lastSyncedAt = Date.now()
  } catch (error) {
    meta.error = messageOf(error)
  } finally {
    meta.syncing = false
    syncRunning = false
    if (syncQueued) {
      syncQueued = false
      void runSync()
    }
  }
}

/** 整体覆盖站点与页面：新增无 recordId 的页面，更新已有页面，删除本地已移除的页面 */
async function syncToBackend(): Promise<void> {
  await portalAdminApi.saveSite({
    name: state.site.name,
    tagline: state.site.tagline,
    description: state.site.description,
    version: state.site.version,
    repositoryUrl: state.site.repositoryUrl,
    footerNote: state.site.footerNote,
  })

  const alive = new Set<string>()
  for (let index = 0; index < state.pages.length; index += 1) {
    const page = state.pages[index]
    alive.add(page.id)
    const body: PortalPageSaveRequest = {
      id: page.id,
      path: normalizePath(page.path),
      title: page.title,
      description: page.description,
      nav: page.nav,
      sections: clone(page.sections),
      sortOrder: index,
      status: 1,
    }
    const recordId = recordIds.get(page.id)
    if (recordId == null) {
      const created = await portalAdminApi.createPage(body)
      recordIds.set(page.id, created.recordId)
    } else {
      await portalAdminApi.updatePage(recordId, body)
    }
  }

  for (const [pageId, recordId] of Array.from(recordIds)) {
    if (alive.has(pageId)) continue
    await portalAdminApi.deletePage(recordId)
    recordIds.delete(pageId)
  }
}

/* -------------------------------- 编辑操作 -------------------------------- */

/** 生成元素 / 条目 ID */
export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 按路径查找页面 */
function findPage(path: string): ContentPage | undefined {
  const target = normalizePath(path)
  return state.pages.find((page) => normalizePath(page.path) === target)
}

/** 新增页面 */
function addPage(page: ContentPage): void {
  state.pages.push(page)
}

/** 删除页面（首页 / 关于页可被删除，但通常建议保留） */
function removePage(id: string): void {
  const index = state.pages.findIndex((page) => page.id === id)
  if (index >= 0) state.pages.splice(index, 1)
}

/** 重置为内置默认内容 */
function resetContent(): void {
  Object.assign(state, clone(defaultContent))
}

/** 导出为格式化 JSON 文本 */
function exportJson(): string {
  return JSON.stringify(state, null, 2)
}

/** 导入 JSON 文本，格式非法时抛出 */
function importJson(raw: string): void {
  const parsed = JSON.parse(raw) as SiteContent
  if (!parsed || !parsed.site || !Array.isArray(parsed.pages)) {
    throw new Error('内容格式不正确：缺少 site 或 pages 字段')
  }
  Object.assign(state, parsed)
}

export const siteContent = {
  state,
  meta,
  /** 需要在门户导航中展示的页面 */
  navPages: computed(() => state.pages.filter((page) => page.nav)),
  normalizePath,
  findPage,
  addPage,
  removePage,
  resetContent,
  exportJson,
  importJson,
  /** 用户端：拉取公开内容（只读） */
  loadPublic,
  /** 管理端：拉取全部内容并开启编辑自动同步 */
  loadAdmin,
  /** 手动触发一次同步（用于「立即保存」等场景） */
  flushSync: runSync,
}

export type SiteContentStore = typeof siteContent
