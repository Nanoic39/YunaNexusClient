import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";

export default defineNuxtConfig({
  // 关闭服务端渲染，启用 SPA 模式
  ssr: false,

  // 开启 Nuxt 4 目录结构支持
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2025-07-15",
  modules: [
    "@nuxt/content",
    "@pinia/nuxt",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/color-mode",
  ],

  icon: {
    serverBundle: {
      collections: ["heroicons"],
    },
  },

  app: {
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      title: "Yuna Nexus Core",
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },

  tailwindcss: {
    viewer: false,
  },

  colorMode: {
    classSuffix: "",
  },

  css: ["~/assets/css/main.css"],

  // 1. 自动导入 Naive UI 的 API (useMessage 等)
  imports: {
    presets: [
      {
        from: "naive-ui",
        imports: [
          "useDialog",
          "useMessage",
          "useNotification",
          "useLoadingBar",
        ],
      },
    ],
  },

  vite: {
    plugins: [
      // 2. 自动导入 Naive UI 的组件 (n-button 等)
      Components({
        resolvers: [NaiveUiResolver()],
      }),
    ],
    optimizeDeps: {
      include: ["naive-ui", "vueuc", "date-fns-tz/formatInTimeZone"],
    },
  },

  nitro: {
    // 移除所有代理配置，使用 runtimeConfig 配置 API 地址
  },

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:9001'
    }
  },

  build: {
    transpile:
      process.env.NODE_ENV === "production"
        ? ["naive-ui", "vueuc", "@css-render/vue3-ssr"]
        : ["naive-ui"],
  },

  devtools: {
    timeline: {
      enabled: true,
    },
  },
});
