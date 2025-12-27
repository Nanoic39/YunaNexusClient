export default defineAppConfig({
  ui: {
    primary: 'indigo', // 建议使用靛蓝色，很有电竞感
    gray: 'zinc',    // Lithe 常用的锌色调，比纯黑更有质感
    button: {
      rounded: 'rounded-md',
      default: {
        size: 'sm'
      }
    },
    card: {
      rounded: 'rounded-xl',
      background: 'bg-white dark:bg-zinc-900',
      ring: 'ring-1 ring-zinc-200 dark:ring-zinc-800' // 标志性的微弱边框
    }
  }
})
