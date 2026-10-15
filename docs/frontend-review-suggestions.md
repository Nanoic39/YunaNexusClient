# YunaNexusClient 前端审查与优化建议

> 审查对象：`YunaNexusClient`（前端仓库，Stage 一 + 门户内容系统）
> 审查依据：前端仓库 `docs/architecture.md`、`docs/roadmap.md`、`docs/design-system.md`，以及后端 `docs/api-contract.md`
> 结论：**框架与样板页交付质量高，分层纪律良好；当前处于「Mock 自洽、接真网关会出问题」的阶段**。以下问题按优先级排列，建议前端 AI 按第七节的顺序落地。

---

## 一、审查范围与方法

- 通读 `packages/core`：`http/*`（client / session / csrf / errors）、`api/*`（auth / permission / notice / audit / file）、`mock/*`（handlers / data）、`content/*`（store / types / defaults）、`env.ts`。
- 通读两个应用：`apps/admin`、`apps/user` 的路由、布局与关键视图。
- 与后端 `docs/api-contract.md` **逐接口比对**（路径、方法、分页、响应结构）。
- 核对与前端声明文档（architecture / roadmap）是否一致。

---

## 二、总体评估（做得好的部分）

- 分层依赖 `apps -> ui -> {theme, core}` 未被打破；`packages/ui` 无业务语义。
- `Result<T>` / `PageResult<T>` / `ApiError` / `NetworkError` 契约类型对齐后端统一响应结构。
- `HttpClient` 职责单一（拼 URL / 注入鉴权与 CSRF / 解包 / 统一错误），三轨鉴权（none / bearer / admin）清晰。
- `handleApiError` 统一鉴权失效跳转；`session` 持久化到 `yuna.session`。
- MSW mock 覆盖面广、返回结构与后端一致；门户内容系统 schema（`SiteContent -> ContentPage -> ...`）设计干净。
- 门户兜底路由 `/:pathMatch(.*)*` + `ContentPageView` 让「管理端加页免改路由表」，设计正确。

---

## 三、P0 · 契约错配（接真网关即坏的硬伤）

后端契约明确下列接口返回 `PageResult`，但前端按**数组**消费；而 **MSW mock 也返回数组，把差异掩盖了**——这是当前 mock 环境「看起来正常」的根因。

### 3.1 站内信收件箱 ✅ 已修复

- 现状：`packages/core/src/api/notice.ts` -> `noticeApi.inbox()` 无分页参数，返回 `NoticeRecordView[]`；`apps/user/src/views/MessagesView.vue` 直接 `notices.value = await noticeApi.inbox()`。
- 契约：`api-contract.md` §7.3 `GET /api/v1/notice/inbox?page=1&size=20`，`data` 为 **PageResult**。
- 后果：接真后端后 `notices.value` 拿到的是分页对象而非数组，列表渲染直接异常。
- 改法：`inbox` 返回类型改为 `PageResult<NoticeRecordView>` 并支持 `page/size`；`MessagesView` 适配 `PageResult.records`；mock 同步改为 `paged(mockNotices, query)`。
- ✅ **已实施**：`inbox` 现为 `PageResult<NoticeRecordView>` + `PageQuery`；`MessagesView` 取 `records` 后在本地分页与筛选；mock 走 `paged()`。

### 3.2 通知记录列表 ✅ 已修复

- 现状：`packages/core/src/api/notice.ts` -> `noticeAdminApi.list()` 返回 `NoticeRecordView[]`。
- 契约：§7.5 `GET /api/v1/notice/record/list?...&page=1&size=20`，`data` 为 **PageResult**。
- 改法：返回类型改 `PageResult<NoticeRecordView>`，mock 用 `paged`。
- ✅ **已实施**：已并入通知中心改造，现为 `noticeAdminApi.listRecords()`，返回 `PageResult<NoticeRecordView>`，管理端「发送记录」页消费；mock 走 `paged()`。

### 3.3 文件列表 ✅ 已修复

- 现状：`packages/core/src/api/file.ts` -> `fileApi.list()` 返回 `FileView[]`。
- 契约：§6.4 `GET /api/v1/file/list?page=1&size=20`，`data` 为 **PageResult**。
- 改法：返回类型改 `PageResult<FileView>`。
- ✅ **已实施**：`fileApi.list()` 现返回 `PageResult<FileView>`。

> **通用建议**：mock 必须与契约同形。凡是后端返回 `PageResult` 的接口，mock 一律用 `paged()`，并显式带 `page/size`，否则 mock 会长期掩盖契约漂移。

---

## 四、P1 · 后端已就绪、前端尚未对接的能力

### 4.1 门户内容持久化（最大缝隙，收益最高）

- 后端已实现（`api-contract.md` §7.6，挂载在通知中心，字段与前端 `SiteContent` 对齐）：
  - 公开读（网关已放行、匿名可访问）：`GET /api/v1/notice/portal/content`、`GET /api/v1/notice/portal/page?path=/about`
  - 管理端 CRUD：`GET|PUT /api/v1/notice/portal/admin/site`、`GET|POST /api/v1/notice/portal/admin/pages`、`GET|PUT|DELETE /api/v1/notice/portal/admin/pages/{id}`
  - 错误码：`60201`-`60205`
- 现状：`packages/core/src/content/store.ts` 为**纯前端 localStorage**（key `yuna.site-content`），零接口调用；`ContentEditorView` 编辑的也是本地内容。
- 建议：新增 `packages/core/src/api/portal.ts`，把 `siteContent` 读写切换为「接口为主、localStorage 为离线缓存」：用户端只读优先 `GET /portal/content`（失败降级本地默认/缓存）；管理端编辑走 `PUT site` + pages 的 POST/PUT/DELETE；保留 `exportJson/importJson` 作为导入导出工具。
- ✅ **已实施**：`types/portal.ts` + `api/portal.ts` 已补齐；`store.ts` 改为接口驱动（`loadPublic`/`loadAdmin` + 700ms 防抖增量同步）；用户端 `main.ts` 启动拉取、管理端 `ContentEditorView` 进入即载入并展示同步状态；MSW 已补 `/api/v1/notice/portal/**`（错误码对齐 60201–60205）。
- 价值：内容多端/多浏览器共享，脱离「换个浏览器内容就没了」的 demo 状态。

### 4.2 用户中心自助资料 / 标签 / 徽章

- 后端已实现：`GET|PUT /api/v1/user/profile`（§4.4/4.5）、`GET|PUT /api/v1/user/tags`（§4.7/4.8）、`GET /api/v1/user/badges`（§4.9）。
- 特别约定：`PUT /user/profile` 中 `mobile/mobileCountry` **仅在 `yunanexus.user.mobile-enabled=true` 时可携带**，关闭时携带返回 `30404`（当前默认关闭）。
- 现状：`apps/user/src/views/ProfileView.vue` 仅展示会话信息（昵称/客户端/到期时间），**无资料编辑、无标签、无徽章**。
- 建议：新增 `api/user.ts`（`userHttp`），个人中心补「资料编辑 / 我的标签 / 我的徽章」；手机号字段在开关关闭时前端隐藏，避免触发 `30404`。

### 4.3 行为分析 API 完全缺失

- 后端 analytics 服务与契约已定义（§8.1 `POST /api/v1/track`、§8.2 `/api/v1/analytics/{funnel,retention,segments,profile}`，错误码 `80001/80002/80003/80101/80102`）。
- 现状：`packages/core/src/api/index.ts` 未导出 analytics 模块，两 app 均无埋点调用。
- 建议：视阶段 10 排期补 `api/analytics.ts`；若前端需埋点，同时封装一个轻量 `track()` 上报器（`authMode: 'none'`）。

---

## 五、P1 · 会话健壮性

### 5.1 无令牌自动刷新（生产可用性关键）

- 现状：`authApi.refresh` **已定义但从未被调用**；`session.expiresAt` 只在 `ProfileView` 用于展示。`HttpClient` 收到 401 时直接 `session.clearUser()` 并回调 `onUnauthorized`（见 `packages/core/src/http/client.ts` 失败分支）。
- 后果：accessToken 过期后用户被硬登出，已持久化的 `refreshToken` 形同虚设。
- 建议：在 `HttpClient` 增加「401（且 code 属于令牌过期）-> 用 `refreshToken` 刷新一次 -> 重放原请求」的拦截逻辑；刷新失败才清会话跳登录。注意并发去重（同一时刻多个 401 只刷新一次）。

### 5.2 CSRF 缓存未清理

- 现状：`packages/core/src/http/csrf.ts` 导出了 `resetCsrf()`，但**全仓无调用点**；登出后掩码令牌仍驻留进程内。
- 建议：登出（`logout` / `logoutAll` / 会话失效）时调用 `resetCsrf()`。

---

## 六、P2 · 权限后台与工程化

### 6.1 权限管理仅只读

- 现状：`packages/core/src/api/permission.ts` 中 `roleApi/permissionApi/menuApi/deptApi` 只有 `list/tree`；`policies/grants/fields` 仅 `list`。
- 后端契约（§5.2-§5.12）提供完整 CRUD（含用户-部门绑定、角色-部门数据范围、字段级规则、菜单增删改）。
- 建议：归入阶段二「接口铺开」，逐步补齐增删改并配套管理端页面。

### 6.2 管理端菜单为静态硬编码

- 现状：`apps/admin/src/config/menu.ts` 为写死的菜单树。
- 后端已有：用户可见菜单（§5.13）、菜单管理（§5.12）。
- 建议：归入阶段三「动态权限路由」，由接口驱动菜单与路由。

### 6.3 无测试、无前端 CI

- 现状：全仓无 `*.spec/*.test`；无 `.github/workflows`。
- roadmap 阶段三已列 Vitest / Playwright / CI 卡口，建议提前落最小闭环（`typecheck` + `build` + 单元测试）作为卡口。

---

## 七、建议推进顺序

1. **修 P0 三处分页错配，并让 mock 与契约同形**（成本低、防止联调爆雷）。
2. **对接门户内容后端 CRUD**（后端已就绪，收益最大）。
3. **补会话自动刷新 + `resetCsrf`**（生产可用性关键）。
4. 铺开阶段二其余接口：权限 CRUD、用户资料/标签/徽章、通知、文件。
5. 进入阶段三：动态权限路由、列表页统一、国际化/暗色、Vitest/Playwright/CI。

---

## 八、附：复核清单（供前端 AI 逐条勾选）

- [x] `noticeApi.inbox` 改为 `PageResult<NoticeRecordView>`，`MessagesView` 适配 `records`
- [x] `noticeAdminApi.list` 改为 `PageResult<NoticeRecordView>`（现为 `listRecords`）
- [x] `fileApi.list` 改为 `PageResult<FileView>`
- [x] mock 中上述接口改用 `paged()`，显式带 `page/size`
- [ ] 新增 `api/portal.ts` 并接入 `siteContent`（读放行、写管理端）
- [ ] 新增 `api/user.ts`（profile/tags/badges），个人中心接入
- [ ] `HttpClient` 增加 401 自动刷新 + 重放（含并发去重）
- [ ] 登出调用 `resetCsrf()`
- [ ] 补 `api/analytics.ts`（或明确阶段 10 不纳入本期）
- [ ] 权限管理 CRUD（阶段二）
- [ ] 动态菜单/路由（阶段三）
- [ ] Vitest + CI 卡口（阶段三）
