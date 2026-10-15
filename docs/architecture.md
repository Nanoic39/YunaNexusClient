# 架构说明

YunaNexus 前端为后端微服务集群（`YunaNexusServer`）的中控台，包含 **用户端** 与 **管理端** 两套独立应用，共享同一套设计系统与核心能力。

## 1. 技术选型

| 维度 | 选型 | 说明 |
| --- | --- | --- |
| 构建 | Vite 6 | 原生 ESM、秒级冷启动、按源码编译工作区包 |
| 框架 | Vue 3.5 + TypeScript | `<script setup>` + 组合式 API，全程 `strict` |
| 组件库 | Naive UI 2.40 | 通过 `themeOverrides` 深度定制，不引入额外 UI 库 |
| 路由 | Vue Router 4 | `createWebHistory`，路由级鉴权 |
| 请求 | 原生 `fetch` 封装 | 无 axios，规避额外依赖与拦截器心智 |
| Mock | MSW 2 | Service Worker 拦截，生产产物不含 msw |
| 仓库 | pnpm workspace | `apps/*` + `packages/*`，包名统一 `@yuna/*` |

## 2. 仓库结构

```
YunaNexusClient/
├─ apps/
│  ├─ admin/                 # 管理端（中控台），dev: 5173
│  └─ user/                  # 用户端（个人门户），dev: 5174
├─ packages/
│  ├─ theme/                 # 设计系统：Token + Naive 主题覆盖 + 全局样式
│  ├─ core/                  # 核心层：HTTP / 契约类型 / 会话 / API / Mock
│  └─ ui/                    # 通用 UI：布局外壳与无业务语义组件
├─ docs/                     # 前端文档（本目录）
├─ pnpm-workspace.yaml
├─ tsconfig.base.json        # 共享 TS 配置，各包 extends
└─ package.json              # 根脚本编排
```

## 3. 分层与依赖方向

```
        apps/admin           apps/user
             │                   │
             └────────┬──────────┘
                      ▼
              packages/ui        （通用组件，无业务语义）
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
  packages/theme             packages/core
  （Token / 主题）            （HTTP / 契约 / 会话 / Mock）
```

- **依赖单向**：`apps → ui → {theme, core}`；`core` 不依赖任何 UI / 路由；`theme` 只依赖 `naive-ui` 的类型。
- **apps 之间零共享**：用户端与管理端不互相引用，业务差异各自在应用内实现。
- **无业务语义下沉**：凡是带业务含义的东西（菜单项、页面、业务组件）都留在 `apps/*`，`packages/ui` 只保留可跨端的展示与布局组件。

## 4. 各包职责

### packages/theme —— 设计系统
- `tokens.ts`：品牌色、灰阶、语义色、圆角、阴影、间距、字体、骨架尺寸。**唯一权威色值来源**。
- `naive-overrides.ts`：`GlobalThemeOverrides`，覆盖 Naive 默认鲜艳色板与偏重阴影，移除输入类控件焦点描边。
- `styles/global.css`：把 Token 暴露为 CSS 变量、消除默认焦点描边、提供最小排版基线与 `.yuna-*` 工具类。

详见 [design-system.md](./design-system.md)。

### packages/core —— 核心层
- `env.ts`：从 Vite 环境变量读取运行配置（`readEnv()`）。
- `types/`：与后端契约一一对应的类型（`Result`/`PageResult` + 各领域类型）。
- `http/`：`HttpClient`（URL 拼接、鉴权注入、CSRF、`Result` 解包、错误归一、**401 续期重试**）、`session`（会话持久化与账号切换清理）、`refresh`（`refreshSession()` 以 `refreshToken` 换新令牌，single-flight 合并并发）、`handoff`（`buildHandoffUrl` / `consumeHandoff`，一次性授权码 + state + PKCE S256 跨端登录）、`errors`（`ApiError`/`NetworkError`）。
- `api/`：按后端服务分模块的接口集合（`authApi`/`authAdminApi`/`noticeApi`/`noticeAdminApi`/`fileApi`/`currentUserApi`/`permissionApi`/`auditApi`）。其中 `noticeApi`（站内信，`userHttp`）与 `noticeAdminApi`（模板 / 发送 / 记录，`adminHttp`）覆盖通知中心两端接口。
- `mock/`：MSW handlers 与内存数据，作为联调默认数据源。
- `content/`：**门户内容系统（接口驱动）**。`types`（页面/区块/元素/条目契约）、`defaults`（内置首页 / 关于页，作为首屏兜底）、`store`（响应式状态 + 接口拉取 / 防抖增量同步 + localStorage 离线缓存 + 导出/导入）。
- `types/portal.ts` + `api/portal.ts`：门户内容后端契约（`/api/v1/notice/portal`）——公开读 `content`/`page`，管理端 `/admin/**` 走用户 JWT（后端按 `admin` 角色放行）。

### packages/ui —— 通用 UI
- 布局：`AppShell`（侧栏 + 顶栏 + 内容区，含 `sider-footer` 插槽）、`PortalShell`（门户顶栏 + 内容 + 页脚）、`AuthLayout`（登录页）。
- 容器：`PageContainer`（标题/操作/标签页/内容）、`SectionCard`（区块卡片）。
- 数据：`FilterBar`（查询栏）、`DataTable`（受控分页表格）、`PageEmpty`（空态）。
- 展示：`MetricCard`（指标卡）、`StatusTag`（状态标签）、`ContentRenderer`（内容元素渲染器，内容系统唯一渲染出口）。
- 工具：`format.ts`（日期/字节/截断）、`status.ts`（后端状态码 → 文案/色调映射）。

## 5. 请求数据流

```
页面调用 api 模块 (authApi.inbox() 等)
        │
        ▼
  api 模块选用 http / userHttp / adminHttp
        │
        ▼
  HttpClient.request<T>()
   ├─ 拼接 baseUrl + path + query（剔除空值）
   ├─ 按 AuthMode 注入 Authorization（`admin` 模式复用用户 JWT）
   ├─ 变更请求附加 CSRF 头（开启时，先引导拉取）
   ├─ fetch（credentials: 'include'）
   └─ 解包 Result<T>：code === 200 返回 data，否则抛 ApiError
        │
        ▼
  MSW（enableMock=true）在 Service Worker 层拦截 ↔ 真实网关（enableMock=false，经 vite proxy）
```

请求失败统一为 `ApiError`，页面用 `handleApiError`（各 app 的 `utils/handle-error.ts`）处理：鉴权失效清会话跳登录，其余透出可读文案。

## 6. 鉴权三轨

| AuthMode | 客户端 | 请求头 | 用途 |
| --- | --- | --- | --- |
| `none` | `http` | 无 | 登录、验证码、CSRF 等匿名接口 |
| `bearer` | `userHttp` | `Authorization: Bearer <accessToken>` | 用户端所有受保护接口 |
| `admin` | `adminHttp` | `Authorization: Bearer <accessToken>`（与用户端同一账号体系） | 管理端所有受保护接口（后端按根角色 `admin` 放行） |

- 会话状态持久化于 `localStorage` 键 `yuna.session`；全站共用一套终端用户会话（`accessToken`），不存在独立的管理端登录。
- 登录态判据：用户端 `session.isAuthenticated`（有 `accessToken`）；管理端 `session.canAccessAdmin`（已持有用户会话且角色含根角色 `admin`）。
- **角色 / 权限视图**：登录成功后与已登录启动时调用 `GET /api/v1/permission/me`（`currentUserApi.me()`，Bearer，网关注入 `X-User-Id`），把 `roles` / `permissions` / `menus` 回填 `session`，并提供 `session.canEnterAdmin`（持有根角色 `admin`，用户端据此显示后台入口）、`hasRole` / `hasPermission` 判据；拉取失败静默降级（按未持有管理角色处理），不阻塞登录。
- **一处登录、两端通行（纯 SSO）**：管理端不设独立密钥，通过授权码换取独立会话；后端对 `/api/v1/permission/admin/**` 按根角色 `admin` 放行。开发环境管理端未登录时跳转用户端登录页，生产环境使用真实固定回调；管理密钥仅用于服务器运维应急。
- 401 / 业务码 `30001`、`30501` 视为鉴权失效（`ApiError.isUnauthorized`）。

## 7. 用户端：门户 + 控制台分离

用户端不再强制登录，按「公开门户」与「个人控制台」两块组织：

| 区域 | 路径 | 登录要求 | 布局 | 内容 |
| --- | --- | --- | --- | --- |
| 门户 | `/`、`/about`、自定义页 | 否 | `PortalShell` | 首页 / 关于页 / 管理端新增的自定义页 |
| 控制台 | `/console/*` | 是（`session.isAuthenticated`） | `AppShell` | 概览 / 站内信 / 个人中心 |

- 路由：门户路由 `meta.public = true`；控制台路由受守卫保护，未登录跳 `/login?redirect=...`。
- **门户兜底路由** `/:pathMatch(.*)*` 承载自定义内容页，配合 `ContentPageView`，使管理端新增页面**无需改动前端路由表**即可生效（未命中页面渲染 404）。
- 控制台侧栏底部提供「返回门户」入口（`AppShell` 的 `sider-footer` 插槽）。
- **双向跳转**：管理端顶栏账号面板提供「进入用户端」（`VITE_USER_URL` → `env.userAppUrl`），用户端对称提供「进入管理后台」（`VITE_ADMIN_URL` → `env.adminAppUrl`）——后者**仅在持有根角色 `admin` 时展示**；两端均为跨应用整页跳转（`window.location.href`），开发环境默认指向对方的 `localhost` 端口（用户端 5174 / 管理端 5173），生产环境必须由环境变量显式配置。

## 8. 门户内容系统（接口驱动）

首页 / 关于页与自定义页均由 **JSON 内容** 描述，结构为 **页面 → 区块 → 元素 → 条目** 四级通用模型：

```
SiteContent
├─ site      站点信息（名称 / 标语 / 描述 / 版本 / 仓库 / 页脚）
└─ pages[]   ContentPage（path / title / nav / sections[]）
   └─ sections[]   ContentSection（title / description / elements[]）
      └─ elements[] ContentElement（type / title / text / items[]）
         └─ items[]   ContentItem（title / text / value / unit / status / link / tags）
```

- **元素类型**：`hero` / `text` / `list` / `metrics` / `cards` / `links` / `timeline` / `divider`；条目状态 `done` / `doing` / `todo`。
- **渲染出口**：`packages/ui` 的 `ContentRenderer` 按 `type` 映射视觉；用户端 `ContentPageView` 按路由 path 取页面后逐区块渲染。
- **存储**：**后端接口为准**。默认值内置于 `packages/core/src/content/defaults.ts` 作首屏兜底；用户端 `loadPublic()` 只读拉取 `/api/v1/notice/portal/content`，管理端 `loadAdmin()` 拉取全量后按 `recordId` 增量同步（站点 PUT；页面 POST / PUT / DELETE）。`localStorage`（键 `yuna.site-content`）仅作离线缓存，由 `store` 深层 `watch` 自动落盘。
- **编辑**：管理端「门户管理 → 门户内容」页（`apps/admin/src/views/ContentEditorView.vue`）增删改站点信息与页面/区块/元素/条目，支持模板新增页面、指定 `path`、重置、导出 / 导入 JSON；编辑停止后**防抖 700ms**自动同步回后端，顶栏展示同步状态。
- **相关项目**：MaiTTx、osu 比赛平台等未来公开项目暂以占位卡片呈现，可通过上述编辑能力随时补充与跳转。

> 之所以采用「区块 + 元素」的通用模型，是为了让管理端能够自由扩展页面内容而无需为每种内容单独建模；内容持久化已由后端 `yunanexus-notice` 的 `PortalController` / `PortalAdminController` 承载（错误码 60201–60205）。

## 9. 端口与代理

| 应用 | dev 端口 | `/api` 代理目标 |
| --- | --- | --- |
| admin | 5173 | `http://localhost:8010`（网关） |
| user | 5174 | `http://localhost:8010`（网关） |

`enableMock=true` 时请求由 MSW 在浏览器内应答，不经过代理；接入真实网关时置 `false`，请求经 vite proxy 转发。

## 10. 相关文档

- [design-system.md](./design-system.md)：设计语言与组件规范
- [development.md](./development.md)：开发规范与协作流程
- [roadmap.md](./roadmap.md)：范围与进度
