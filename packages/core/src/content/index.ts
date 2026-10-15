/**
 * 门户内容系统（纯前端实现）。
 *
 * - `types`   ：页面 / 区块 / 元素 / 条目的契约
 * - `defaults`：内置默认内容（首页 / 关于页）
 * - `store`   ：响应式状态 + localStorage 持久化 + 导入导出
 * - `status`  ：服务运行状态取数（聚合接口 / 每服务独立地址）
 */
export * from './types'
export * from './defaults'
export * from './store'
export * from './status'
