import 'vue-router'

/** 路由元信息扩展：标题与免鉴权标记 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 文档标题与面包屑用 */
    title?: string
    /** 是否无需登录即可访问 */
    public?: boolean
  }
}
