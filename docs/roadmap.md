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
| 两端登录打通（一处登录两端通行 / 生产 SSO） | ✅ 完成 | 不同域/端口部署下 localStorage 不共享，靠 URL 片段（`#yuna_sso=<base64url>`）接驳会话：用户端「进入管理后台」带片段跳转，管理端启动 `consumeHandoff()` 回填并**立即清除片段**；管理端**纯 SSO**：`adminHttp` 直接复用用户 JWT（`Authorization: Bearer`，后端按根角色 `admin` 放行），无独立管理端密钥；管理端守卫与错误处理改用 `session.canAccessAdmin`；生产环境管理端登录页不再单列，未登录自动跳用户端统一登录（`/login?redirect=<管理端>`）；无管理角色者进入 `/403` 而非回跳，避免环路 |

> 门户内容已从「纯前端 localStorage」切换为**接口驱动**：公开读 `/api/v1/notice/portal/content`、`/page?path=`；管理端 `/admin/**` 走用户 JWT（后端按根角色 `admin` 放行）。

> **两端登录打通为纯 SSO**：管理端不设独立密钥，直接复用用户 JWT；后端对 `/api/v1/permission/admin/**` 按根角色 `admin` 放行（由用户完成后端改造）。开发环境管理端未登录时跳用户端登录页，生产环境两端合并为 SSO。

## 阶段二 · 认证与用户（进行中）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 会话续期（刷新令牌） | ✅ 完成 | `packages/core/src/http/refresh.ts` 提供 `refreshSession()`（single-flight 合并并发）；`HttpClient` 收到 401 时先用 `refreshToken` 换新令牌并**重试一次**，失败才清会话并回调 `onUnauthorized` |
| 用户端注册 | ✅ 完成 | `/register`（`RegisterView.vue`）；前端校验与后端 `RegisterRequest` 对齐（账号 4~64 且仅 `[a-zA-Z0-9_.-]`、密码 8~64）；手机号功能未开放故不提供该字段；已存在（30401）单独提示 |
| 用户端解锁申诉 | ✅ 完成 | `/unlock-appeal`（`UnlockAppealView.vue`）；字段约束与 `UnlockAppealRequest` 对齐（`appealReason` ≤500、`contact` ≤128）；重复待处理（30301）单独提示；登录页 footer 提供「注册账号 / 账号被锁定？提交解锁申诉」入口 |
| 管理端申诉审核 | ✅ 完成 | `/appeals`（`AppealListView.vue`）；按状态筛选、分页；待处理申诉支持「通过（自动解锁）/ 驳回」，审核备注可选（≤500）；菜单「系统管理 → 申诉审核」 |
| 验证码 | ✅ 完成 | 登录页连续失败 3 次启用验证码（`GET /api/v1/auth/captcha`），Mock 模式回显验证码便于自测 |
| 管理端用户启用/禁用/解锁/踢下线 | ✅ 完成 | `/users`（`UserListView.vue`）已有操作闭环，本期确认与后端契约一致 |
| 管理端权限管理 | ✅ 完成 | 角色管理 `/roles`（CRUD + 权限点 / 菜单 / 数据范围绑定）、权限点 `/permissions`、菜单管理 `/menus`（树 + CRUD）、部门管理 `/depts`（树 + CRUD）；`api/permission.ts` 补齐写接口，MSW 全链路；菜单「权限管理」分组 |

> MSW 已补齐 `POST /auth/register`、`POST /auth/unlock-appeal`，与后端错误码（30401 / 30403 / 30404、30001 / 30301）一致；生产环境仍不启用 Mock。

## 阶段二 · 增补：通知中心

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 用户端站内信 | ✅ 完成 | `MessagesView.vue`：`inbox` 按 `PageResult` 消费，按服务端分页读取完整收件箱（后端暂不支持按状态过滤）、本页未读计数、一键「本页已读」（无批量接口，逐条幂等调用 `read/{noticeId}`）；`MessageDetailView.vue` 改用 `GET /api/v1/notice/inbox/{noticeId}` 按 ID 取单条，不再受收件箱分页影响 |
| 管理端通知模板 | ✅ 完成 | `/notice/templates`（`NoticeTemplateListView.vue`）：分页 + 当前页关键字筛选 + 新建 / 编辑（编码创建后不可改）+ 启用 / 停用 + 删除；标题 / 正文支持 `${占位符}` |
| 管理端发送通知 | ✅ 完成 | `/notice/send`（`NoticeSendView.vue`）：选模板 → 通道（可覆盖模板配置）→ 多接收方 → 延迟等级（RocketMQ 1~18，0 立即）→ 占位符参数 → 实时内容预览 |
| 管理端发送记录 | ✅ 完成 | `/notice/records`（`NoticeRecordListView.vue`）：按模板编码 / 接收方 / 状态检索、分页、详情弹窗（`record/{noticeId}`） |
| 数据层与 Mock | ✅ 完成 | `api/notice.ts`（收件箱 / 详情 / 已读、模板 CRUD、发送、记录）、`types/notice.ts`、`status.ts` 增 `noticeChannelText`；MSW handlers 与模板种子对齐契约（`60101`~`60103`） |
| 菜单入口 | ✅ 完成 | 管理端「通知管理」分组：通知模板 / 发送通知 / 发送记录 |

> 后端暂无「批量已读」与「发送重试」接口，前端以逐条幂等调用与只读展示应对；待后端提供后再切换。

## 阶段二 · 增补：系统默认数据与容错

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 默认角色 / 权限 / 菜单 / 部门 | ✅ 完成 | `mock/data.ts` 内置：5 个默认角色（`admin` 超级管理员 / `ops` 运维 / `auditor` 审计 / `user` 普通用户 / `guest` 访客）、15 个权限点（101–115）、与 `apps/admin/src/config/menu.ts` 路由对齐的菜单树、6 个部门；`/permission/me` 按「启用角色权限并集」推导权限 |
| 内置根账号 `nanoic` | ✅ 完成 | 随系统初始化创建（`userId=10000`），默认绑定 `admin` 根角色（角色由管理员派生），拥有完全系统控制；新注册用户默认绑定 `user` 普通用户角色（`DEFAULT_USER_ROLE_ID`） |
| 注册默认启用邮箱验证 | 🚧 前端就绪 | 注册页邮箱改为**必填**并校验格式，注册成功提示「验证邮件已发送」；待后端提供验证 / 重发接口与「未验证不可登录」错误码后接入 |
| 乱码容错 | ✅ 完成 | `packages/core/src/http/mojibake.ts` 对后端「UTF-8 被按 cp1252 误解码」产生的乱码做只读还原，接入 HTTP 客户端响应与错误消息；含真实中文的文本不受影响，后端修复字符集后自动失效 |

> **后端待办**（前端已就位，等待后端实现）：
> - **邮箱验证**：`POST /api/v1/auth/register` 默认启用邮箱验证，并提供「验证 / 重发」接口与「未验证不可登录」的登录错误码（当前契约 §3.4 无此能力，`RegisterRequest.email` 仍为可选）。
> - **乱码根因**：响应 / 数据库连接字符集统一为 UTF-8（前端容错仅为兜底，不替代后端修复）。

## 阶段二：接口铺开（下一期）

在样板页验证通过后，按后端服务逐模块补齐：

- **认证与用户**：注册、解锁申诉、刷新令牌、验证码；管理端用户启用/禁用/解锁/踢下线。
- **权限**：角色、菜单、数据范围管理页。
- **通知**：✅ 站内信详情与批量已读；管理端模板管理、发送通知、发送记录（重试待后端提供接口）。
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


## 本期增补 · 个人中心

- 本人资料编辑：昵称、头像地址、联系邮箱；仅提交变更字段，允许清空。
- 联系邮箱属于资料展示，不改变认证中心登录邮箱；手机号功能关闭，不提供改绑入口。
- 本人标签：添加、移除、撤销和保存，最多 20 个；颜色仅接受有效六位十六进制值。
- 本人徽章只读展示，包含级别、描述与授予时间。
- 加载失败按区块展示；保存后同步顶栏昵称，刷新前提醒未保存修改。
- 网关仍验证 JWT，用户服务按注入身份限制为本人；不需要管理角色。
- 新增头像协议、部分更新和标签边界单元测试；生产环境禁用 Mock。

### 管理与账号工作流

徽章定义/手动发放/记录、接入应用申请/审核/重审/启停/密钥轮转已有真实后端，生产启用 `VITE_OAUTH_APP_REGISTRATION_ENABLED=true`。自动徽章条件规则尚未开放。
角色与权限主页面使用树和详情区，角色绑定继续使用权限/菜单/部门树。
新用户绑定 `user`，`super_admin` 也可访问管理台；系统角色受保护，管理员不能禁用自己或主动重置他人密码。
登录页可进入邮箱验证找回；临时密码不能直接登录，必须继续设置新密码。管理员按独立权限只读查看重置审计。个人账号设置提供改密、找回邮箱、外观与授权设备快捷入口。
所有密码保持不可逆哈希；无原密码查看功能。
