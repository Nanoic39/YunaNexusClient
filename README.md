# YunaNexusClient

> YunaNexus 用户门户与管理控制台 —— 统一中控平台的前端入口
> Managed By *YunaNexus Project*

YunaNexusClient 是 [YunaNexus](https://github.com/Nanoic39/YunaNexus) 的前端工作区，
基于 **Vue 3、TypeScript、Vite 与 Naive UI**。用户门户与管理控制台独立构建，
共享主题、接口契约、会话管理和门户内容系统。

当前为**基础框架与联调阶段**，页面及接口持续开发；生产环境使用真实后端，禁止 Mock 兜底。

---

## 核心能力

| 能力 | 提供者 | 当前范围 |
| :--- | :--- | :--- |
| 用户门户 | `apps/user` | 首页、关于页、登录注册、个人工作台框架 |
| 管理控制台 | `apps/admin` | 管理登录、用户列表、门户内容编辑框架 |
| 接口与会话 | `packages/core` | 统一 Result 解包、Bearer / 管理密钥、CSRF |
| 门户内容 | `packages/core/content` | 页面与区块模型、后端持久化同步 |
| 服务状态 | `packages/core/content/status` | 单服务与汇总查询、状态和每日历史展示 |
| 主题与组件 | `packages/theme`、`packages/ui` | 设计令牌、Naive UI 定制与通用布局 |

---

## 技术栈

| 类别 | 技术 |
| :--- | :--- |
| 框架 | Vue 3 / Vue Router 4 |
| 语言 | TypeScript |
| 构建 | Vite 6 |
| UI | Naive UI / Ionicons |
| 工作区 | pnpm 8.15.4 workspace |
| 开发 Mock | MSW，仅开发模式启用 |
| 生产验证 | vue-tsc / TypeScript / Vite production build |
| 持续交付 | GitHub Actions + 服务器拉取发布包 |

---

## 模块结构

```text
YunaNexusClient/
├── apps/
│   ├── admin/                 # 管理控制台，开发端口 5173
│   └── user/                  # 用户门户，开发端口 5174
├── packages/
│   ├── core/                  # HTTP、契约、会话、API、内容与 Mock
│   ├── theme/                 # 设计令牌、主题覆盖、全局样式
│   └── ui/                    # 共享组件与布局
├── docs/                      # 架构、设计系统、开发规范与路线图
├── scripts/                   # 发布检查、打包与 CI 发布
└── .github/workflows/         # master 测试、生产构建和发布流程
```

---

## 快速开始

```bash
pnpm install --frozen-lockfile
pnpm msw:init
pnpm dev:admin
pnpm dev:user
```

开发配置参考各应用 `.env.example`。启用 Mock 可离线开发；关闭后 `/api` 由 Vite 代理到
本地网关 `http://localhost:8010`。

| 脚本 | 说明 |
| :--- | :--- |
| `pnpm dev:admin` / `pnpm dev:user` | 启动开发服务器 |
| `pnpm typecheck` | 全工作区类型检查 |
| `pnpm build` | 构建两个生产应用 |
| `pnpm build:admin` / `pnpm build:user` | 单独构建 |
| `pnpm msw:init` | 初始化开发 Mock Worker |
| `pnpm format:check` | 检查格式 |

---

## 生产环境与持续交付

| 项目 | 地址或约定 |
| :--- | :--- |
| 用户门户（临时 IP） | `https://103.39.66.135` |
| 管理控制台（临时 IP） | `https://103.39.66.135:8443` |
| 计划域名 | `yuna.nanoic.cc`、`console.yuna.nanoic.cc`，备案完成后切换 |
| API | 同源 `/api/v1`；不依赖跨域 Cookie |
| 状态查询 | `/api/v1/status` 或条目独立 `/api/v1/status/auth` |
| 服务器发布位置 | `/YunaNexus/platform/releases/frontend` |
| 生产分支 | `master` |

两个应用的 `.env.production` 仅包含可公开的站点设置：生产模式、关闭 Mock、启用 CSRF、
同源 API 与真实用户端入口。**所有 `VITE_*` 都会进入浏览器，不允许放入管理员密钥或其他秘密。**
生产构建强制禁用 Mock，即使误填开发模式也不会启用。管理员密钥仅由操作者登录时输入，
只保存在当前浏览器会话，不再写入持久化 localStorage。

每次推送 master，Actions 先进行敏感文件检查、类型检查和 production 构建，
再发布带 SHA-256 校验和的版本包。服务器检查发布包并切换用户端与管理端版本；
PR 不发布。服务器凭据不进入 GitHub，运行文件和发布缓存均位于独立数据盘。

```bash
pnpm typecheck
pnpm build
python3 scripts/package-release.py frontend
```

服务器首次初始化、启动、TLS、回滚和容量管理参见后端仓库的
[生产部署说明](https://github.com/Nanoic39/YunaNexus/blob/main/deploy/production/README.md)。

---

## 文档导航

| 文档 | 内容 |
| :--- | :--- |
| [架构说明](docs/architecture.md) | 分层、数据流与鉴权 |
| [设计系统](docs/design-system.md) | 色板、主题和组件规范 |
| [开发规范](docs/development.md) | 环境、脚本及扩展方式 |
| [路线图](docs/roadmap.md) | 当前范围与后续计划 |
| [后端项目](https://github.com/Nanoic39/YunaNexus) | 服务实现、API 契约及部署运维 |
