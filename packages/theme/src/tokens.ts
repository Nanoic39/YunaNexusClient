/**
 * YunaNexus 设计 Token
 *
 * 品牌基色（见根 README）：`#A0D8EF`（蓝）、`#80FFC0`（薄荷绿）、`#F5F6F8`（浅灰）。
 *
 * 设计原则：
 * - 中控台以中性灰承载信息，品牌色仅用于交互点缀，克制使用主题色 / 阴影 / 磨砂。
 * - 品牌原色偏浅，直接用于实心按钮对比度不足，故派生 `blue[600]` 作为交互主色，
 *   `blue[300]` 保留为品牌识别色（Logo / 高亮 / 选中底色）。
 */

/** 品牌基色：仅三色，禁止在组件中直接硬编码 */
export const brand = {
  blue: '#A0D8EF',
  mint: '#80FFC0',
  gray: '#F5F6F8',
} as const

/** 品牌蓝派生色阶（浅 → 深），300 为品牌原色，600 为交互主色 */
export const blue = {
  50: '#F2F9FD',
  100: '#E2F2FA',
  200: '#C4E6F5',
  300: '#A0D8EF',
  400: '#79C6E8',
  500: '#4FAEDD',
  600: '#2E8FC4',
  700: '#226F9B',
  800: '#1B5878',
  900: '#143F56',
} as const

/** 薄荷绿派生色阶，用作成功 / 正向强调 */
export const mint = {
  50: '#EBFDF4',
  100: '#CFFBE4',
  200: '#A6F7CE',
  300: '#80FFC0',
  400: '#43DE9C',
  500: '#1FA971',
} as const

/** 中性灰阶（阿里云 / Arco 风格），中控台的绝对主色 */
export const gray = {
  50: '#F7F8FA',
  100: '#F2F3F5',
  200: '#E5E6EB',
  300: '#D7DAE0',
  400: '#C9CDD4',
  500: '#A9AEB8',
  600: '#667085',
  700: '#4E5969',
  800: '#272E3B',
  900: '#1D2129',
} as const

/** 语义色 */
export const semantic = {
  success: '#16794F',
  warning: '#946200',
  danger: '#C3313A',
  info: blue[700],
} as const

/** 圆角：中控台偏克制，默认 6px */
export const radius = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  pill: '999px',
} as const

/** 阴影：三级以内，弱扩散，避免"漂浮感" */
export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(29, 33, 41, 0.04)',
  sm: '0 1px 4px rgba(29, 33, 41, 0.06), 0 1px 2px rgba(29, 33, 41, 0.04)',
  md: '0 4px 12px rgba(29, 33, 41, 0.08)',
  lg: '0 8px 24px rgba(29, 33, 41, 0.10)',
} as const

/** 字号：以 14px 为正文基准 */
export const fontSize = {
  xs: '12px',
  sm: '13px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  xxl: '20px',
  title: '24px',
} as const

/** 间距 */
export const space = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '32px',
} as const

/** 骨架尺寸，供 AppShell / 布局组件复用 */
export const layout = {
  siderWidth: '216px',
  siderCollapsedWidth: '64px',
  headerHeight: '52px',
  contentPadding: '16px 20px',
  pageMaxWidth: '1680px',
} as const

/** 字体族：优先系统字体，中英文兼顾 */
export const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif"

/** 等宽字体：ID / traceId / 时间戳等技术字段 */
export const fontFamilyMono =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"

export const tokens = {
  brand,
  blue,
  mint,
  gray,
  semantic,
  radius,
  shadow,
  fontSize,
  space,
  layout,
  fontFamily,
  fontFamilyMono,
} as const

export type Tokens = typeof tokens
