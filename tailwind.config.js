/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{vue,js,ts,jsx,tsx}", // 必须包含这个路径，否则 CSS 不会生效
    "./app.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
