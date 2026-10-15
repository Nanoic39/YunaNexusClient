# 路线图与进度

> 本期范围（用户已确认）：**先做框架 + 样板页**——只交付设计系统、布局、路由与少量样板页，验证风格与架构后再批量铺开。

## 阶段一：框架与样板（本期）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| pnpm 单仓多包脚手架 | ✅ 完成 | workspace、根脚本、TS/Prettier、gitignore |
| `packages/theme` 设计系统 | ✅ 完成 | Token、Naive 主题覆盖、全局样式（克制阴影、无描边焦点） |
| `packages/core` 核心层 | ✅ 完成 | HTTP 客户端、契约类型、会话、CSRF、错误、API 模块、Mock |
| `packages/ui` 通用组件 | ✅ 完成 | AppShell / AuthLayout / PageContainer / FilterBar / DataTable / StatusTag / MetricCard / SectionCard / PageEmpty |
| `apps/admin` 管理端 | ✅ 完成 | 登录、概览、用户管理样板页；路由鉴权（AdminToken） |
| `apps/user` 用户端 | ✅ 完成 | 登录、概览、站内信、个人中心样板页；路由鉴权（Bearer） |
| 文档 | ✅ 完成 | 架构 / 设计系统 / 开发规范 / 路线图 + README |
| 依赖安装与构建验证 | ✅ 完成 | `pnpm install` → `msw:init`（两个 app 各生成 worker）→ `typecheck` / `build` 全绿；dev 双端冒烟通过 |

## 阶段一 · 增补：门户化与内容系统

在框架基础上追加的一轮改造：

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 用户端门户 / 控制台分离 | ✅ 完成 | 公开门户（`/`、`/about`、自定义页，无需登录）+ 控制台（`/console/*`，需登录）；新增 `PortalShell` 与门户兜底路由 |
| 控制台外壳重设计 | ✅ 完成 | `AppShell` 侧栏三段式（品牌 / 菜单 / 页脚），新增 `sider-footer` 插槽；用户端据此提供「返回门户」 |
| 登录页重设计 | ✅ 完成 | `AuthLayout` 重写为「左品牌区 + 右表单卡片」，补充 `brand-description`，消除大面积留白 |
| 首页 / 关于页 | ✅ 完成 | 由 JSON 内容驱动，展示项目信息、运行状态、开发规划、项目组成员与相关项目 |
| 门户内容系统 | ✅ 完成 | `packages/core/src/content`：页面 → 区块 → 元素 → 条目四级模型；后端接口为准，localStorage 作为离线缓存与首屏兜底 |
| 管理端门户内容编辑 | ✅ 完成 | 站点信息、页面/区块/元素/条目增删、模板新增页面、指定 path、重置、导出 / 导入 JSON |
| 门户内容接后端 | ✅ 完成 | `packages/core/src/api/portal.ts` + `types/portal.ts`；用户端 `loadPublic()` 只读拉取已发布内容，管理端 `loadAdmin()` 拉全量后**防抖**增量同步（站点 PUT；页面按 `recordId` POST / PUT / DELETE）；DEV 走 MSW Mock，生产直连真实网关 |
| 用户端进入管理后台入口 | ✅ 完成 | 登录后（及已登录启动时）调 `GET /api/v1/permission/me` 回填 `session` 的角色 / 权限 / 菜单；顶栏账号面板在**持有根角色 `admin`** 时展示「进入管理后台」，跳转 `VITE_ADMIN_URL`（DEV 默认 `localhost:5173`），与管理端「进入用户端」对称 |

> 门户内容已从「纯前端 localStorage」切换为**接口驱动**：公开读 `/api/v1/notice/portal/content`、`/page?path=`；管理端 `/admin/**` 走 `X-Admin-Token` 静态密钥鉴权。

## 阶段二：接口铺开（下一期）

在样板页验证通过后，按后端服务逐模块补齐：

- **认证与用户**：注册、解锁申诉、刷新令牌、验证码；管理端用户启用/禁用/解锁/踢下线。
- **权限**：角色、菜单、数据范围管理页。
- **通知**：站内信详情与批量已读；管理端模板管理、发送记录与重试。
- **文件**：上传、下载、列表（含分片 / 断点）。
- **审计**：审计日志查询与详情。
- **元数据**：字典 / 配置管理。

## 阶段三：平台能力（规划）

- 路由与菜单按后端返回的权限动态生成。
- 列表页统一：筛选条件持久化、排序、列显隐、导出。
- 国际化（中 / 英）与暗色主题（复用 `themeOverrides` 机制）。
- 健壮性：请求重试 / 取消、统一错误边界、加载骨架。
- 工程质量：单元测试（Vitest）、E2E（Playwright）、CI 卡口（typecheck + build + lint）。

## 变更约定

- 设计或架构调整时，**同步更新** `docs/` 下对应文档与根 `README.md`。
- 每期结束在本文件更新状态表，保持"文档即现状"。
