import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 文档标题（同时用于侧栏高亮与浏览器标题） */
    title?: string
    /** 是否为无需登录的公开路由 */
    public?: boolean
  }
}
