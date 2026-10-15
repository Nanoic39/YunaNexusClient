# 开发规范

## 1. 环境要求

- Node.js `>= 18`（当前联调环境 Node v24）
- pnpm `8.15.4`（根 `package.json` 的 `packageManager` 已锁定，建议 `corepack enable`）

## 2. 安装与启动

```bash
pnpm install            # 安装全部工作区依赖

pnpm msw:init           # 生成 public/mockServiceWorker.js（首次必做）
pnpm dev:admin          # 管理端 → http://localhost:5173
pnpm dev:user           # 用户端 → http://localhost:5174

pnpm typecheck          # 全工作区类型检查（vue-tsc --noEmit）
pnpm build              # 构建 admin + user
pnpm build:admin        # 仅构建管理端
pnpm build:user         # 仅构建用户端
pnpm format             # Prettier 格式化
```

### 首次运行前提：生成 Mock Worker
MSW 依赖 `public/mockServiceWorker.js` 才能拦截请求。`pnpm msw:init` 会以非交互方式（`--save`）把该文件写入 `apps/admin/public` 与 `apps/user/public`，并在 `packages/core/package.json` 的 `msw.workerDirectory` 中登记这两个目录——此后 `pnpm install` 会自动把 worker 复制到对应目录。**未生成时 Mock 无法启动。**

## 3. 环境变量

各应用通过 `.env` / `.env.local` 配置（模板见 `apps/*/.env.example`），由 `packages/core/src/env.ts` 读取：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `VITE_ENABLE_MOCK` | `true` | 是否启用 MSW Mock |
| `VITE_API_BASE_URL` | 空 | 接口基础路径；留空表示同源（开发期走 vite proxy） |
| `VITE_ENABLE_CSRF` | `false` | 是否回显 CSRF 令牌（后端开启时同步打开） |
| `VITE_APP_TITLE` | `YunaNexus` | 应用标题 |

## 4. 接真实网关

1. 将目标应用的 `VITE_ENABLE_MOCK` 置为 `false`。
2. 启动网关（默认 `http://localhost:8010`），`/api` 已由 vite proxy 转发。
3. 后端开启 CSRF 时，同步置 `VITE_ENABLE_CSRF=true`。

关闭 Mock 后 `msw` 不会进入生产产物（`main.ts` 中为动态 `import`）。

## 5. 编码约定

### 通用
- TypeScript 全程 `strict`，且开启 `noUnusedLocals` / `noUnusedParameters` / `verbatimModuleSyntax` —— **未使用的导入/参数会导致构建失败**。
- 类型导入一律使用 `import type`。
- 仅在必要时写注释，注释解释「为什么」而非「做了什么」。

### 导入顺序
1. Vue / 框架核心（`vue`、`vue-router`）
2. 第三方（`naive-ui`、`@vicons/*`）
3. 工作区包（`@yuna/*`）
4. 应用内相对/别名（`@/...`）

### 路径别名
- 应用内：`@/*` → `apps/<app>/src/*`
- 工作区包：直接引用包名（`@yuna/core`、`@yuna/ui`、`@yuna/theme`）

### 样式
- 组件样式使用 `<style scoped>`；跨页面复用的工具类上收到 `@yuna/theme/styles.css`，禁止在各 app 重复定义。
- 色值只允许用 CSS 变量或 `tokens`，禁止硬编码。

## 6. 扩展指引

### 新增页面
1. 在 `apps/<app>/src/views/` 新建 `XxxView.vue`，用 `PageContainer` 组织。
2. 在 `apps/<app>/src/router/index.ts` 注册路由，填写 `meta.title`。
3. 若需出现在侧栏，在 `apps/<app>/src/config/menu.ts` 增加菜单项（key 与路由 path 一致）。

### 新增通用组件
1. 放 `packages/ui/src/components/Xxx.vue`，保持无业务语义。
2. 在 `packages/ui/src/components/index.ts` 导出。
3. 若含状态映射，放进 `utils/status.ts`；格式化放进 `utils/format.ts`。

### 新增接口模块
1. 在 `packages/core/src/types/` 定义契约类型（对齐后端 `docs/api-contract.md`）。
2. 在 `packages/core/src/api/` 新建模块，按鉴权需求选用 `http` / `userHttp` / `adminHttp`。
3. 在 `packages/core/src/api/index.ts` 导出。
4. 在 `packages/core/src/mock/handlers.ts` 补对应 handler，保证 Mock 可用。

## 7. 提交前自查

```bash
pnpm typecheck && pnpm build
```

- [ ] 类型检查通过
- [ ] 未硬编码色值 / 未新增重复工具类
- [ ] 新接口已同步 Mock handler 与类型
- [ ] 文档（本目录）已随设计/架构调整同步更新

## 8. 常见问题

### `pnpm install` 报 `ERR_PNPM_EPERM`
在受限沙箱中，pnpm 无法写入全局 store（`D:\.pnpm-store`）与缓存（`%LOCALAPPDATA%\pnpm-cache`）。两种处理：
1. 在可访问全局 store 的终端外执行 `pnpm install`；
2. 或把 store / cache 重定向到项目内：
   ```bash
   pnpm install --store-dir .pnpm-store --cache-dir .pnpm-cache
   ```

### Mock 未生效
- 确认已执行 `pnpm msw:init` 生成 `public/mockServiceWorker.js`。
- 确认 `VITE_ENABLE_MOCK=true`，并检查浏览器控制台是否有 SW 注册报错。

### 页面 401 被踢回登录
属预期行为：`handleApiError` 对 `isUnauthorized` 会清会话并跳转登录。检查 `Authorization: Bearer` 是否正确注入（管理端与用户端共用同一套用户 JWT，无独立管理端密钥）。
