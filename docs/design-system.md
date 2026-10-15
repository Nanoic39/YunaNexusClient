# 设计系统

面向中控台的设计语言：**以中性灰承载信息，品牌色仅作交互点缀**。目标是对齐阿里云 / 腾讯云 / 谷歌控制台的克制观感——不追求装饰性视觉，追求信息密度与可用性。

## 1. 设计原则

1. **克制用色**：界面主体是灰阶；品牌色只出现在交互态（按钮、选中、链接）与关键标识上。
2. **克制阴影**：默认无阴影，仅浮层（Modal / Drawer / Dropdown）使用弱扩散阴影，避免"漂浮感"。
3. **不用磨砂**：不做 backdrop-blur 毛玻璃，保持文字清晰与性能。
4. **无描边焦点**：移除浏览器默认 `outline`，聚焦态由输入框 **边框变色** 表达。
5. **模块化**：页面由容器（`PageContainer`）+ 区块（`SectionCard`）+ 通用组件组合而成，禁止每页重写排版。

## 2. 色板（`packages/theme/src/tokens.ts`）

### 品牌基色
| 名称 | 值 | 用途 |
| --- | --- | --- |
| 品牌蓝 | `#A0D8EF` | 品牌识别色（Logo、选中底色）；原色偏浅，不直接作实心主色 |
| 薄荷绿 | `#80FFC0` | 正向强调 / 品牌辅助色 |
| 浅灰 | `#F5F6F8` | 页面背景（`--yuna-bg`） |

### 品牌蓝派生色阶
`blue[300]` 保留品牌原色；**`blue[600]`（`#2E8FC4`）为交互主色**（实心按钮白字可读）。

```
50  #F2F9FD   100 #E2F2FA   200 #C4E6F5   300 #A0D8EF   400 #79C6E8
500 #4FAEDD   600 #2E8FC4   700 #226F9B   800 #1B5878   900 #143F56
```

### 中性灰阶（中控台绝对主色）
```
50  #F7F8FA   100 #F2F3F5   200 #E5E6EB   300 #D7DAE0   400 #C9CDD4
500 #A9AEB8   600 #86909C   700 #4E5969   800 #272E3B   900 #1D2129
```

### 语义色
| 名称 | 值 | 说明 |
| --- | --- | --- |
| success | `#1FA971` | 成功 / 正向 |
| warning | `#E8A33D` | 警告 |
| danger | `#E5484D` | 危险 / 错误 |
| info | `blue[600]` | 信息 |

> 禁止在组件中硬编码色值。组件内一律使用 CSS 变量（`var(--yuna-*)`）或 `tokens`，Naive 组件交由 `themeOverrides`。

## 3. 形状 / 阴影 / 排版

- **圆角**：默认 `6px`（`radius.md`）；卡片 `8px`，小控件（Tag）`4px`。
- **阴影**（三级以内）：
  - `xs` `0 1px 2px rgba(29,33,41,.04)`
  - `sm` `0 1px 4px rgba(29,33,41,.06), 0 1px 2px rgba(29,33,41,.04)`
  - `md` `0 4px 12px rgba(29,33,41,.08)`
- **字号**：正文 `14px`，次要信息 `13px`，辅助/标签 `12px`，页面标题 `20px`。
- **行高**：`1.5715`。
- **字体族**：系统字体优先（`-apple-system` / `PingFang SC` / `Microsoft YaHei` …）；技术字段（ID / traceId / 时间戳）用等宽字体 `.yuna-mono`。
- **间距**：以 `8px` 为基准栅格（`4 / 8 / 12 / 16 / 20 / 24 / 32`）。

## 4. Naive UI 定制要点（`naive-overrides.ts`）

- `common`：主色映射 `blue[600]`，背景 `brand.gray`，卡片/表格/输入统一白底，`borderRadius: 6px`。
- `Input` / `InternalSelection`：`boxShadowFocus: 'none'`，聚焦仅靠 `borderFocus` 变色。**这是"无描边焦点"的核心落点**。
- `Button`：次级按钮描边 `gray[300]`，hover 变 `blue[500]`；主色按钮白字。
- `Card`：`boxShadow: 'none'` + 细边框 `gray[200]`，贴合平铺观感。
- `DataTable`：表头灰底 `gray[50]`，斑马纹 `gray[50]`，行 hover `gray[50]`。
- 其它覆盖：`Menu` / `Pagination` / `Tabs` / `Dropdown` / `Descriptions` / `Result` / `Scrollbar` 等，统一朝灰阶 + 品牌蓝收拢。

## 5. 无描边焦点

`global.css` 中的全局规则：

```css
:focus,
:focus-visible { outline: none; }
```

- 表单控件：由 Naive 的 `borderFocus` + `boxShadowFocus: 'none'` 表达聚焦。
- 纯链接/按钮角色：保留极弱可见提示 `box-shadow: 0 0 0 2px var(--yuna-blue-100)`，兼顾键盘可达性。

## 6. CSS 变量与工具类

全局 `:root` 暴露：品牌与色板、语义色、圆角/阴影、骨架尺寸（`--yuna-header-height` 等）、字体族。

提供的工具类（`global.css`）：

| 类名 | 用途 |
| --- | --- |
| `.yuna-container` | 页面内容容器，限制最大宽度并居中 |
| `.yuna-mono` | 技术字段等宽字体 |
| `.yuna-metric-grid` | 指标卡自适应网格 |
| `.yuna-cell` / `.yuna-cell__sub` | 表格「主标题 + 副信息」单元格 |
| `.yuna-cell-actions` | 行内按钮 / 标签组 |
| `.yuna-cell-grid` | 键值信息网格（概览 / 详情） |
| `.yuna-points` | 认证页品牌区要点列表 |
| `.yuna-fallback` | 独立回退页（404 / 异常兜底） |

## 7. 组件规范（`packages/ui`）

组件一律「**无业务语义**」，通过 props 与插槽组合。

| 组件 | 关键 props | 插槽 | 场景 |
| --- | --- | --- | --- |
| `AppShell` | `menuOptions` `value` `collapsed` `brandTitle` `brandSubtitle` | `logo` `header-left` `header-actions` `sider-footer` `default` | 中控台外壳（侧栏 + 顶栏 + 内容区） |
| `PortalShell` | `brandTitle` `brandTagline` `navItems` `activePath` `footerNote` `version` | `logo` `actions` `footer` `default` | 公开门户外壳（顶栏 + 内容 + 页脚） |
| `AuthLayout` | `brandTitle` `brandTagline` `brandDescription` `heading` `subheading` `tips` | `logo` `brand` `brand-footer` `default` `footer` `copyright` | 登录 / 认证页（左品牌 → 右表单卡片） |
| `PageContainer` | `title` `description` | `breadcrumb` `extra` `tabs` `default` | 页面统一头尾与边距 |
| `SectionCard` | `title` `description` `flush` | `extra` `default` | 区块卡片 |
| `ContentRenderer` | `section` | —（`navigate` 事件） | 门户内容元素渲染（内容系统唯一出口） |
| `MetricCard` | `label` `value` `unit` `trend` `trendLabel` `loading` | `icon` `footer` | 指标数字 |
| `StatusTag` | `meta` `tone` `text` `size` `bordered` | — | 状态标签 |
| `FilterBar` | `loading` `showReset` `showDefaultActions` | `default`（条件字段）`actions` | 查询筛选栏 |
| `DataTable` | `columns` `data` `loading` `total` `page` `size` `pageSizes` `rowKey` … | `empty`（透传 $attrs） | 受控分页表格 |
| `PageEmpty` | `description` `size` | `default`（引导操作） | 空态占位 |

### 工具函数
- `format.ts`：`formatDateTime` / `formatRelative` / `formatBytes` / `truncateMiddle`。
- `status.ts`：`userStatusMeta` / `appealStatusMeta` / `noticeStatusMeta` / `enabledStatusMeta` / `auditStatusMeta` / `dataScopeText`，返回 `{ tone, text }` 供 `StatusTag` 使用。

## 8. 使用约定

- 页面结构：`PageContainer` 包裹，内部用 `SectionCard` 分区，指标用 `MetricCard` 网格。
- 列表页：`PageContainer` + `FilterBar` + `DataTable`（受控分页），空态由 `DataTable` 内建。
- 状态展示：一律走 `StatusTag` + `status.ts` 映射，禁止在页面里散落 `if/else` 配色。
- 数字对齐：指标与金额使用 `font-variant-numeric: tabular-nums`（`MetricCard` 已内置）。
- 门户内容页：由 `ContentRenderer` 按元素 `type` 统一渲染，页面本身不写元素样式；新增元素类型时只需在此渲染器中扩展分支。
