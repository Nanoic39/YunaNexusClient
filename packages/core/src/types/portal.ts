/**
 * 门户内容后端契约（对应 yunanexus-notice 的 `PortalController` / `PortalAdminController`）。
 *
 * - 公开读：`GET /api/v1/notice/portal/content`、`GET /api/v1/notice/portal/page`（网关放行，匿名可访问）。
 * - 管理端：`/api/v1/notice/portal/admin/**`，携带用户 JWT（后端按 `admin` 角色放行）。
 *
 * 结构（page → section → element → item）与前端 `content/types.ts` 完全一致，
 * 故视图类型直接复用内容模型，仅管理端补充 `recordId` 等元数据。
 */

import type { ContentPage, ContentSection, SiteMeta } from '../content/types'

/** 站点元信息（公开读数出结构，与 `SiteMeta` 一致） */
export type PortalSiteMeta = SiteMeta

/** 页面内容（公开读数出结构，与 `ContentPage` 一致） */
export type PortalPageContent = ContentPage

/** 站点 + 全部已发布页面（`GET /content` 的输出） */
export interface PortalSiteContentView {
  site: PortalSiteMeta
  pages: PortalPageContent[]
}

/** 管理端站点视图（附带管理元数据） */
export interface PortalSiteView extends SiteMeta {
  siteKey?: string
  /** 状态：1-启用 0-停用 */
  status?: number
  createTime?: string
  updateTime?: string
}

/**
 * 管理端页面视图（附带管理元数据）。
 *
 * `recordId` 为数据库主键，是管理端 PUT / DELETE 的路径参数；
 * 而 `id` 是页面业务标识（前端路由 key）。
 */
export interface PortalPageView extends ContentPage {
  recordId: number
  /** 排序号（升序） */
  sortOrder?: number
  /** 状态：1-已发布 0-草稿 */
  status?: number
  createTime?: string
  updateTime?: string
}

/** 页面保存请求（管理端新增 / 修改共用，整体覆盖） */
export interface PortalPageSaveRequest {
  /** 页面标识（站点内唯一，前端路由 key） */
  id: string
  path: string
  title: string
  description?: string
  nav?: boolean
  sections: ContentSection[]
  /** 排序号（升序） */
  sortOrder?: number
  /** 状态：1-已发布 0-草稿；缺省为已发布 */
  status?: number
}

/** 站点保存请求（管理端整体覆盖） */
export interface PortalSiteSaveRequest {
  name: string
  tagline?: string
  description?: string
  version?: string
  repositoryUrl?: string
  footerNote?: string
}
