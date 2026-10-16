/** Vite 环境变量（此处显式声明，避免依赖 vite/client 全局类型） */
interface ImportMetaEnv {
  /**
   * 运行模式：`development`（本地联调，可走 Mock） / `production`（强制真实数据）。
   * 留空时按 Vite 的 dev / build 自动推断。
   */
  readonly VITE_APP_ENV?: string
  /** 接口基础路径；留空表示与前端同源（由 Vite 代理或网关注入） */
  readonly VITE_API_BASE_URL?: string
  /**
   * 是否启用 MSW Mock（'true' / 'false'）。
   * 仅开发模式生效，默认 true；生产模式强制关闭，禁止 Mock 兜底。
   */
  readonly VITE_ENABLE_MOCK?: string
  /** 是否启用 CSRF 令牌回显（真实网关开启 CSRF 校验时置 'true'） */
  readonly VITE_ENABLE_CSRF?: string
  readonly VITE_OAUTH_APP_REGISTRATION_ENABLED?: string
  /** 应用标题 */
  readonly VITE_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
