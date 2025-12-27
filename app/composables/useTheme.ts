import { computed } from "vue";
import { darkTheme, lightTheme, type GlobalThemeOverrides } from "naive-ui";

export const useTheme = () => {
  const colorMode = useColorMode();

  const theme = computed(() => {
    return colorMode.value === "dark" ? darkTheme : lightTheme;
  });

  // Monet Theme Definition
  const primaryColor = "#6692E1";
  const primaryColorHover = "#7FA4E8";
  const primaryColorPressed = "#507AC0";
  const primaryColorSuppl = "#507AC0";

  const commonOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: primaryColor,
      primaryColorHover: primaryColorHover,
      primaryColorPressed: primaryColorPressed,
      primaryColorSuppl: primaryColorSuppl,

      infoColor: primaryColor,
      infoColorHover: primaryColorHover,
      infoColorPressed: primaryColorPressed,
      infoColorSuppl: primaryColorSuppl,

      successColor: "#88B04B", // Muted Green
      successColorHover: "#9CC260",
      successColorPressed: "#75993D",

      warningColor: "#EFC050", // Muted Gold
      warningColorHover: "#F5D070",
      warningColorPressed: "#D9AB3C",

      errorColor: "#E57373", // Muted Red
      errorColorHover: "#F09090",
      errorColorPressed: "#D05A5A",

      borderRadius: "8px",
      borderRadiusSmall: "4px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
  };

  const lightThemeOverrides: GlobalThemeOverrides = {
    ...commonOverrides,
    common: {
      ...commonOverrides.common,
      bodyColor: "#F2F5F9",
      cardColor: "#FFFFFF",
      popoverColor: "#FFFFFF",
      modalColor: "#FFFFFF",
      textColorBase: "#334155",
      textColor1: "#334155",
      textColor2: "#64748B",
      textColor3: "#94A3B8",
      borderColor: "rgba(102, 146, 225, 0.15)",
    },
    Layout: {
      color: "#F2F5F9",
      siderColor: "#FFFFFF",
      headerColor: "#FFFFFF",
    },
    Card: {
      color: "rgba(255, 255, 255, 0.9)",
      borderColor: "rgba(102, 146, 225, 0.15)",
    },
    Menu: {
      itemTextColor: "#64748B",
      itemTextColorHover: primaryColor,
      itemTextColorActive: primaryColor,
      itemIconColor: "#94A3B8",
      itemIconColorHover: primaryColor,
      itemIconColorActive: primaryColor,
      itemColorActive: "rgba(102, 146, 225, 0.1)",
      itemColorHover: "rgba(102, 146, 225, 0.05)",
    },
  };

  const darkThemeOverrides: GlobalThemeOverrides = {
    ...commonOverrides,
    common: {
      ...commonOverrides.common,
      bodyColor: "#0F172A",
      cardColor: "#1E293B",
      popoverColor: "#1E293B",
      modalColor: "#1E293B",
      textColorBase: "#E2E8F0",
      textColor1: "#E2E8F0",
      textColor2: "#94A3B8",
      textColor3: "#64748B",
      borderColor: "rgba(255, 255, 255, 0.08)",
    },
    Layout: {
      color: "#0F172A",
      siderColor: "#1E293B",
      headerColor: "#1E293B",
    },
    Card: {
      color: "rgba(30, 41, 59, 0.7)",
      borderColor: "rgba(255, 255, 255, 0.08)",
    },
    Menu: {
      itemTextColor: "#94A3B8",
      itemTextColorHover: "#E2E8F0",
      itemTextColorActive: primaryColor,
      itemIconColor: "#64748B",
      itemIconColorHover: "#E2E8F0",
      itemIconColorActive: primaryColor,
      itemColorActive: "rgba(102, 146, 225, 0.15)",
      itemColorHover: "rgba(255, 255, 255, 0.05)",
    },
  };

  const themeOverrides = computed(() => {
    return colorMode.value === "dark"
      ? darkThemeOverrides
      : lightThemeOverrides;
  });

  const toggleTheme = () => {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
  };

  return {
    theme,
    themeOverrides,
    toggleTheme,
    isDark: computed(() => colorMode.value === "dark"),
  };
};
