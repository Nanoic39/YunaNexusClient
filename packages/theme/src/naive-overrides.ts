import type { GlobalThemeOverrides } from 'naive-ui'
import { blue, brand, fontFamily, gray, mint, radius, semantic, shadow } from './tokens'

/**
 * Naive UI 全局主题覆盖。
 *
 * 以「中性灰 + 品牌蓝点缀」为基调，覆盖掉 Naive 偏鲜艳的默认色板与偏重的阴影，
 * 并移除输入类控件的焦点描边（改用边框变色 + 极弱背景态），对齐大厂控制台的克制观感。
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    // 主色：品牌蓝派生 600，实心按钮白字可读
    primaryColor: blue[700],
    primaryColorHover: blue[800],
    primaryColorPressed: blue[900],
    primaryColorSuppl: blue[800],
    infoColor: semantic.info,
    infoColorHover: blue[500],
    infoColorPressed: blue[700],
    infoColorSuppl: blue[500],
    successColor: semantic.success,
    successColorHover: mint[400],
    successColorPressed: mint[500],
    successColorSuppl: mint[400],
    warningColor: semantic.warning,
    warningColorHover: '#F0B057',
    warningColorPressed: '#D8922E',
    warningColorSuppl: '#F0B057',
    errorColor: semantic.danger,
    errorColorHover: '#EA6B6F',
    errorColorPressed: '#CE4045',
    errorColorSuppl: '#EA6B6F',

    // 文本与背景
    textColorBase: gray[900],
    textColor1: gray[900],
    textColor2: gray[700],
    textColor3: gray[600],
    placeholderColor: gray[600],
    borderColor: gray[300],
    dividerColor: gray[200],
    bodyColor: brand.gray,
    cardColor: '#FFFFFF',
    modalColor: '#FFFFFF',
    popoverColor: '#FFFFFF',
    tableColor: '#FFFFFF',
    inputColor: '#FFFFFF',
    hoverColor: gray[100],

    // 形状与字体
    borderRadius: radius.md,
    borderRadiusSmall: radius.sm,
    fontFamily,
    fontSize: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    lineHeight: '1.5715',
    boxShadow1: shadow.sm,
    boxShadow2: shadow.md,
    boxShadow3: shadow.lg,
  },

  Layout: {
    color: brand.gray,
    siderColor: '#FFFFFF',
    siderBorderColor: gray[200],
    siderTextColor: gray[800],
    headerColor: '#FFFFFF',
    headerBorderColor: gray[200],
    headerTextColor: gray[900],
    footerColor: gray[50],
  },

  Menu: {
    itemHeight: '38px',
    borderRadius: radius.md,
    itemBorderRadius: radius.md,
    itemTextColor: gray[700],
    itemTextColorHover: blue[700],
    itemTextColorActive: blue[700],
    itemTextColorActiveHover: blue[700],
    itemTextColorChildActive: blue[700],
    itemIconColor: gray[600],
    itemIconColorHover: blue[600],
    itemIconColorActive: blue[600],
    itemIconColorActiveHover: blue[600],
    itemColorHover: gray[100],
    itemColorActive: blue[50],
    itemColorActiveHover: blue[100],
    itemColorActiveCollapsed: blue[50],
    arrowColor: gray[600],
  },

  Button: {
    fontWeight: '500',
    fontWeightStrong: '600',
    borderRadiusMedium: radius.md,
    borderRadiusSmall: radius.sm,
    paddingMedium: '0 14px',
    color: '#FFFFFF',
    colorHover: gray[50],
    colorPressed: gray[100],
    colorFocus: gray[50],
    textColor: gray[800],
    textColorHover: blue[700],
    textColorPressed: blue[800],
    textColorFocus: blue[700],
    border: `1px solid ${gray[300]}`,
    borderHover: `1px solid ${blue[500]}`,
    borderPressed: `1px solid ${blue[700]}`,
    borderFocus: `1px solid ${blue[500]}`,
    colorPrimary: blue[700],
    colorHoverPrimary: blue[800],
    colorPressedPrimary: blue[900],
    colorFocusPrimary: blue[800],
    borderPrimary: `1px solid ${blue[600]}`,
    borderHoverPrimary: `1px solid ${blue[500]}`,
    borderPressedPrimary: `1px solid ${blue[700]}`,
    borderFocusPrimary: `1px solid ${blue[500]}`,
    textColorPrimary: '#FFFFFF',
    textColorHoverPrimary: '#FFFFFF',
    textColorPressedPrimary: '#FFFFFF',
    textColorFocusPrimary: '#FFFFFF',
  },

  Input: {
    borderRadius: radius.md,
    heightMedium: '34px',
    color: '#FFFFFF',
    colorFocus: '#FFFFFF',
    border: `1px solid ${gray[300]}`,
    borderHover: `1px solid ${blue[500]}`,
    borderFocus: `1px solid ${blue[500]}`,
    boxShadowFocus: 'none',
    caretColor: blue[600],
    textColor: gray[900],
    placeholderColor: gray[600],
  },

  // Select / DatePicker / Cascader 等复用内部选择器样式
  InternalSelection: {
    borderRadius: radius.md,
    heightMedium: '34px',
    color: '#FFFFFF',
    colorActive: '#FFFFFF',
    border: `1px solid ${gray[300]}`,
    borderHover: `1px solid ${blue[500]}`,
    borderFocus: `1px solid ${blue[500]}`,
    borderActive: `1px solid ${blue[500]}`,
    boxShadowFocus: 'none',
    boxShadowActive: 'none',
    textColor: gray[900],
    placeholderColor: gray[600],
    arrowColor: gray[600],
  },

  Card: {
    borderRadius: radius.lg,
    color: '#FFFFFF',
    borderColor: gray[200],
    paddingMedium: '16px 20px',
    paddingSmall: '12px 16px',
    titleFontWeight: '600',
    titleFontSizeMedium: '15px',
    boxShadow: 'none',
  },

  DataTable: {
    borderRadius: radius.lg,
    thColor: gray[50],
    thColorHover: gray[100],
    thTextColor: gray[700],
    thFontWeight: '500',
    tdColor: '#FFFFFF',
    tdColorHover: gray[50],
    tdColorStriped: gray[50],
    borderColor: gray[200],
    thPaddingMedium: '10px 16px',
    tdPaddingMedium: '12px 16px',
    fontSizeMedium: '14px',
  },

  Pagination: {
    itemBorderRadius: radius.md,
    itemSizeMedium: '30px',
    itemTextColor: gray[700],
    itemTextColorHover: blue[600],
    itemTextColorActive: '#FFFFFF',
    itemColorHover: gray[100],
    itemColorActive: blue[600],
    itemColorActiveHover: blue[500],
    itemBorder: `1px solid ${gray[300]}`,
    itemBorderHover: `1px solid ${blue[400]}`,
    itemBorderActive: `1px solid ${blue[600]}`,
  },

  Form: {
    labelTextColor: gray[700],
    labelFontWeight: '500',
  },

  Breadcrumb: {
    itemTextColor: gray[600],
    itemTextColorHover: blue[600],
    itemTextColorActive: gray[900],
    itemTextColorChildActive: gray[900],
    separatorColor: gray[400],
    fontSize: '13px',
  },

  Tabs: {
    tabTextColorActiveLine: blue[600],
    tabTextColorHoverLine: blue[600],
    barColor: blue[600],
    tabTextColorLine: gray[700],
    tabFontWeightActive: '500',
  },

  Tag: {
    borderRadius: radius.sm,
    heightSmall: '20px',
    heightMedium: '24px',
  },

  Modal: {
    borderRadius: radius.lg,
    color: '#FFFFFF',
    boxShadow: shadow.lg,
  },

  Drawer: {
    borderRadius: radius.lg,
    color: '#FFFFFF',
    boxShadow: shadow.lg,
  },

  Dropdown: {
    borderRadius: radius.md,
    optionTextColor: gray[800],
    optionTextColorActive: blue[700],
    optionColorHover: gray[100],
    optionColorActive: blue[50],
    optionHeightMedium: '34px',
  },

  Tooltip: {
    borderRadius: radius.md,
  },

  Switch: {
    railColorActive: blue[600],
    railColor: gray[400],
  },

  Descriptions: {
    thColor: gray[50],
    thTextColor: gray[700],
    tdTextColor: gray[800],
    borderColor: gray[200],
  },

  Divider: {
    color: gray[200],
    textColor: gray[600],
  },

  Result: {
    titleFontSize: '20px',
    iconColorInfo: blue[600],
  },

  Scrollbar: {
    color: gray[300],
    colorHover: gray[400],
  },
}

/**
 * 暗色（夜间）主题表面 / 文本 / 边框基准，与 `global.css` 的 `html.dark` 变量保持一致。
 */
const dark = {
  page: '#14171d',
  surface: '#1b1f27',
  surface2: '#232833',
  hover: '#262b36',
  active: '#2b313d',
  border: '#2b313d',
  divider: '#242a34',
  text1: '#e8eaf0',
  text2: '#aab2c0',
  text3: '#8b93a5',
  text4: '#6b7385',
} as const

/**
 * Naive UI 暗色主题覆盖。
 *
 * 与浅色 `themeOverrides` 结构一一对应，配合 Naive 内置 `darkTheme` 使用：
 * 保留品牌蓝作为交互主色，把中性灰整体翻转为深色表面层级。
 */
export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: blue[400],
    primaryColorHover: blue[300],
    primaryColorPressed: blue[500],
    primaryColorSuppl: blue[400],
    infoColor: blue[500],
    infoColorHover: blue[400],
    infoColorPressed: blue[600],
    infoColorSuppl: blue[400],
    successColor: '#5dd4a3',
    successColorHover: '#5fe6ab',
    successColorPressed: mint[500],
    successColorSuppl: '#5fe6ab',
    warningColor: '#eab86b',
    warningColorHover: '#f0b057',
    warningColorPressed: '#d8922e',
    warningColorSuppl: '#f0b057',
    errorColor: '#f18e93',
    errorColorHover: '#ea6b6f',
    errorColorPressed: '#ce4045',
    errorColorSuppl: '#ea6b6f',

    textColorBase: dark.text1,
    textColor1: dark.text1,
    textColor2: dark.text2,
    textColor3: dark.text3,
    placeholderColor: dark.text4,
    borderColor: dark.border,
    dividerColor: dark.divider,
    bodyColor: dark.page,
    cardColor: dark.surface,
    modalColor: dark.surface,
    popoverColor: dark.surface,
    tableColor: dark.surface,
    inputColor: dark.surface2,
    hoverColor: dark.hover,

    borderRadius: radius.md,
    borderRadiusSmall: radius.sm,
    fontFamily,
    fontSize: '14px',
    fontSizeSmall: '13px',
    fontWeightStrong: '600',
    lineHeight: '1.5715',
    boxShadow1: '0 1px 2px rgba(0, 0, 0, 0.4)',
    boxShadow2: '0 4px 12px rgba(0, 0, 0, 0.48)',
    boxShadow3: '0 8px 24px rgba(0, 0, 0, 0.56)',
  },

  Layout: {
    color: dark.page,
    siderColor: dark.surface,
    siderBorderColor: dark.border,
    siderTextColor: dark.text2,
    headerColor: dark.surface,
    headerBorderColor: dark.border,
    headerTextColor: dark.text1,
    footerColor: dark.surface,
  },

  Menu: {
    itemHeight: '38px',
    borderRadius: radius.md,
    itemBorderRadius: radius.md,
    itemTextColor: dark.text2,
    itemTextColorHover: blue[300],
    itemTextColorActive: blue[300],
    itemTextColorActiveHover: blue[200],
    itemTextColorChildActive: blue[300],
    itemIconColor: dark.text3,
    itemIconColorHover: blue[300],
    itemIconColorActive: blue[300],
    itemIconColorActiveHover: blue[200],
    itemColorHover: dark.hover,
    itemColorActive: 'rgba(79, 174, 221, 0.18)',
    itemColorActiveHover: 'rgba(79, 174, 221, 0.26)',
    itemColorActiveCollapsed: 'rgba(79, 174, 221, 0.18)',
    arrowColor: dark.text3,
  },

  Button: {
    fontWeight: '500',
    fontWeightStrong: '600',
    borderRadiusMedium: radius.md,
    borderRadiusSmall: radius.sm,
    paddingMedium: '0 14px',
    color: dark.surface2,
    colorHover: dark.hover,
    colorPressed: dark.active,
    colorFocus: dark.hover,
    textColor: dark.text1,
    textColorHover: blue[200],
    textColorPressed: blue[300],
    textColorFocus: blue[200],
    border: `1px solid ${dark.border}`,
    borderHover: `1px solid ${blue[500]}`,
    borderPressed: `1px solid ${blue[600]}`,
    borderFocus: `1px solid ${blue[500]}`,
    colorPrimary: blue[400],
    colorHoverPrimary: blue[300],
    colorPressedPrimary: blue[500],
    colorFocusPrimary: blue[300],
    borderPrimary: `1px solid ${blue[500]}`,
    borderHoverPrimary: `1px solid ${blue[400]}`,
    borderPressedPrimary: `1px solid ${blue[600]}`,
    borderFocusPrimary: `1px solid ${blue[400]}`,
    textColorPrimary: '#0b1117',
    textColorHoverPrimary: '#0b1117',
    textColorPressedPrimary: '#0b1117',
    textColorFocusPrimary: '#0b1117',
  },

  Input: {
    borderRadius: radius.md,
    heightMedium: '34px',
    color: dark.surface2,
    colorFocus: dark.surface2,
    border: `1px solid ${dark.border}`,
    borderHover: `1px solid ${blue[500]}`,
    borderFocus: `1px solid ${blue[500]}`,
    boxShadowFocus: 'none',
    caretColor: blue[400],
    textColor: dark.text1,
    placeholderColor: dark.text4,
  },

  InternalSelection: {
    borderRadius: radius.md,
    heightMedium: '34px',
    color: dark.surface2,
    colorActive: dark.surface2,
    border: `1px solid ${dark.border}`,
    borderHover: `1px solid ${blue[500]}`,
    borderFocus: `1px solid ${blue[500]}`,
    borderActive: `1px solid ${blue[500]}`,
    boxShadowFocus: 'none',
    boxShadowActive: 'none',
    textColor: dark.text1,
    placeholderColor: dark.text4,
    arrowColor: dark.text3,
  },

  Card: {
    borderRadius: radius.lg,
    color: dark.surface,
    borderColor: dark.border,
    paddingMedium: '16px 20px',
    paddingSmall: '12px 16px',
    titleFontWeight: '600',
    titleFontSizeMedium: '15px',
    boxShadow: 'none',
  },

  DataTable: {
    borderRadius: radius.lg,
    thColor: dark.surface2,
    thColorHover: dark.hover,
    thTextColor: dark.text2,
    thFontWeight: '500',
    tdColor: dark.surface,
    tdColorHover: dark.hover,
    tdColorStriped: '#1f242e',
    borderColor: dark.border,
    thPaddingMedium: '10px 16px',
    tdPaddingMedium: '12px 16px',
    fontSizeMedium: '14px',
  },

  Pagination: {
    itemBorderRadius: radius.md,
    itemSizeMedium: '30px',
    itemTextColor: dark.text2,
    itemTextColorHover: blue[300],
    itemTextColorActive: '#0b1117',
    itemColorHover: dark.hover,
    itemColorActive: blue[500],
    itemColorActiveHover: blue[400],
    itemBorder: `1px solid ${dark.border}`,
    itemBorderHover: `1px solid ${blue[500]}`,
    itemBorderActive: `1px solid ${blue[500]}`,
  },

  Form: {
    labelTextColor: dark.text2,
    labelFontWeight: '500',
  },

  Breadcrumb: {
    itemTextColor: dark.text3,
    itemTextColorHover: blue[300],
    itemTextColorActive: dark.text1,
    itemTextColorChildActive: dark.text1,
    separatorColor: dark.text4,
    fontSize: '13px',
  },

  Tabs: {
    tabTextColorActiveLine: blue[300],
    tabTextColorHoverLine: blue[300],
    barColor: blue[400],
    tabTextColorLine: dark.text2,
    tabFontWeightActive: '500',
  },

  Tag: {
    borderRadius: radius.sm,
    heightSmall: '20px',
    heightMedium: '24px',
  },

  Modal: {
    borderRadius: radius.lg,
    color: dark.surface,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.56)',
  },

  Drawer: {
    borderRadius: radius.lg,
    color: dark.surface,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.56)',
  },

  Dropdown: {
    borderRadius: radius.md,
    optionTextColor: dark.text2,
    optionTextColorActive: blue[300],
    optionColorHover: dark.hover,
    optionColorActive: 'rgba(79, 174, 221, 0.18)',
    optionHeightMedium: '34px',
  },

  Tooltip: {
    borderRadius: radius.md,
  },

  Switch: {
    railColorActive: blue[500],
    railColor: dark.text4,
  },

  Descriptions: {
    thColor: dark.surface2,
    thTextColor: dark.text2,
    tdTextColor: dark.text1,
    borderColor: dark.border,
  },

  Divider: {
    color: dark.divider,
    textColor: dark.text3,
  },

  Result: {
    titleFontSize: '20px',
    iconColorInfo: blue[400],
  },

  Scrollbar: {
    color: '#3a414f',
    colorHover: '#4a5261',
  },
}

export default themeOverrides
