/**
 * @yuna/theme —— 设计系统入口
 *
 * 对外暴露三类能力：
 * - `tokens`：设计 Token（唯一权威来源，组件禁止硬编码色值）
 * - `themeOverrides` / `darkThemeOverrides`：Naive UI 明暗两套主题覆盖
 * - `themeMode`：自动 / 日间 / 夜间模式状态（含持久化与 `<html>` 同步）
 *
 * 全局 CSS 通过 `@yuna/theme/styles.css` 单独引入，避免隐式副作用。
 */
export * from './tokens'
export { themeOverrides, darkThemeOverrides, default as defaultThemeOverrides } from './naive-overrides'
export { themeMode } from './theme-mode'
export type { ThemeMode, ResolvedTheme, ThemeModeStore } from './theme-mode'
