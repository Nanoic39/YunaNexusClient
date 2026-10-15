import { adminHttp, http } from '../http/client'
import type {
  PortalPageContent,
  PortalPageSaveRequest,
  PortalPageView,
  PortalSiteContentView,
  PortalSiteSaveRequest,
  PortalSiteView,
} from '../types/portal'

const BASE = '/api/v1/notice/portal'

/** 门户内容 · 公开读（终端门户，匿名可访问） */
export const portalApi = {
  /** 站点信息 + 全部已发布页面 */
  content: () => http.request<PortalSiteContentView>(`${BASE}/content`),

  /** 按路由路径读取单个已发布页面 */
  page: (path: string) => http.request<PortalPageContent>(`${BASE}/page`, { query: { path } }),
}

/** 门户内容 · 管理端（需 `X-Admin-Token`） */
export const portalAdminApi = {
  getSite: () => adminHttp.request<PortalSiteView>(`${BASE}/admin/site`),
  saveSite: (body: PortalSiteSaveRequest) =>
    adminHttp.request<PortalSiteView>(`${BASE}/admin/site`, { method: 'PUT', body }),

  listPages: () => adminHttp.request<PortalPageView[]>(`${BASE}/admin/pages`),
  getPage: (recordId: number) => adminHttp.request<PortalPageView>(`${BASE}/admin/pages/${recordId}`),
  createPage: (body: PortalPageSaveRequest) =>
    adminHttp.request<PortalPageView>(`${BASE}/admin/pages`, { method: 'POST', body }),
  updatePage: (recordId: number, body: PortalPageSaveRequest) =>
    adminHttp.request<PortalPageView>(`${BASE}/admin/pages/${recordId}`, { method: 'PUT', body }),
  deletePage: (recordId: number) =>
    adminHttp.request<void>(`${BASE}/admin/pages/${recordId}`, { method: 'DELETE' }),
}
