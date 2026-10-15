/**
 * 门户内容契约（纯前端内容系统）。
 *
 * 用户端的首页 / 关于页 / 自定义页，与管理端的「门户内容」编辑器共用同一套结构：
 * 页面（Page）→ 区块（Section）→ 元素（Element）→ 条目（Item）。
 *
 * 采用「区块 + 元素」的通用模型，是为了让管理端可以自由增删页面元素、扩展内容，
 * 而无需为每种内容单独建模。内置页面（首页 / 关于页）同样以数据描述，可被编辑。
 */

/** 元素类型：决定用户端的渲染方式 */
export type ContentElementType =
  | 'hero'
  | 'text'
  | 'list'
  | 'metrics'
  | 'cards'
  | 'links'
  | 'timeline'
  | 'services'
  | 'divider'

/** 条目状态：timeline / cards 表达进度，services 表达服务运行状态 */
export type ContentItemStatus = 'done' | 'doing' | 'todo'

/** 元素内的最小条目单位 */
export interface ContentItem {
  id: string
  title?: string
  text?: string
  /** metrics 类型的数值 */
  value?: string
  /** metrics 类型的单位 */
  unit?: string
  /** timeline / cards 的状态 */
  status?: ContentItemStatus
  /** 跳转链接：以 `/` 开头为站内路由，`http` 开头为外部链接 */
  link?: string
  /** cards / list 的标签 */
  tags?: string[]
  /**
   * services 元素专用：该服务的独立状态接口地址。
   * 返回 `{ status }` 或 `Result<{ status }>`，status ∈ up / degraded / down。
   * 未配置时回退到 `status` 静态值。
   */
  statusUrl?: string
}

/** 区块内的元素 */
export interface ContentElement {
  id: string
  type: ContentElementType
  title?: string
  text?: string
  items: ContentItem[]
  /**
   * services 元素专用：聚合状态接口地址。
   * 返回 `{ status, services? }`，`services[]` 可携带各服务（key/name + status）。
   * 配置后优先于条目的独立 `statusUrl`。
   */
  statusUrl?: string
  /** services 元素专用：状态轮询间隔（秒），默认 30，最小 5 */
  statusIntervalSeconds?: number
}

/** 页面区块 */
export interface ContentSection {
  id: string
  title: string
  description?: string
  elements: ContentElement[]
}

/** 页面：首页 / 关于页 / 自定义页统一建模 */
export interface ContentPage {
  id: string
  /** 路由路径，如 `/`、`/about`、`/maittx` */
  path: string
  /** 页面标题（门户导航与浏览器标题） */
  title: string
  description?: string
  /** 是否在门户顶部导航中展示 */
  nav: boolean
  sections: ContentSection[]
}

/** 站点基本信息 */
export interface SiteMeta {
  name: string
  tagline: string
  description: string
  version: string
  repositoryUrl?: string
  footerNote?: string
}

/** 内容根结构 */
export interface SiteContent {
  site: SiteMeta
  pages: ContentPage[]
}
