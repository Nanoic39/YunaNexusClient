/**
 * @yuna/theme —— 设计系统入口
 *
 * 对外暴露三类能力：
 * - `tokens`：设计 Token（唯一权威来源，组件禁止硬编码色值）
 * - `themeOverrides` / `darkThemeOverrides`：Naive UI 明暗两套主题覆盖
 * - `displayMode`：日夜显示（自动 / 日间 / 夜间）
 * - `appearance`：配色、字体、界面风格与布局密度（按账户隔离）
 *
 * 全局 CSS 通过 `@yuna/theme/styles.css` 单独引入，避免隐式副作用。
 */
export * from './tokens'
export {
  themeOverrides,
  darkThemeOverrides,
  default as defaultThemeOverrides,
} from './naive-overrides'
export { themeMode } from './theme-mode'
export type { ThemeMode, ResolvedTheme, ThemeModeStore } from './theme-mode'

/** 日间/夜间显示模式，与配色、字体、布局组成的主题方案分离。 */
export { themeMode as displayMode } from './theme-mode'
export * from './appearance'

export type { ThemeMode as DisplayMode } from './theme-mode'
