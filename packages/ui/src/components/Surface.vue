<script setup lang="ts">
/**
 * 玻璃容器。
 *
 * 两档材质，区别是"是否承载交互"：
 * - card：内容卡，0.78 白 + 14px 模糊，可读性优先
 * - pop：浮层（下拉/菜单/抽屉），0.88 白 + 7px 模糊，文字必须清晰
 *
 * 阴影只在这一层出现，行、按钮、输入框不加阴影（阴影仅表达层级）。
 */
withDefaults(
  defineProps<{
    /** 材质档位 */
    tone?: 'card' | 'pop'
    /** 是否带内边距（默认带） */
    padded?: boolean
  }>(),
  { tone: 'card', padded: true },
)
</script>

<template>
  <div class="yuna-surface" :class="[`is-${tone}`, { 'is-padded': padded }]">
    <slot />
  </div>
</template>

<style scoped>
.yuna-surface {
  border: 1px solid var(--yuna-glass-border);
  border-radius: var(--yuna-radius-card);
  -webkit-backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
  backdrop-filter: blur(var(--yuna-glass-blur)) saturate(180%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75), var(--yuna-elev-card);
}

.is-card {
  background: var(--yuna-glass-surface);
}

.is-pop {
  background: var(--yuna-glass-surface-strong);
  box-shadow: var(--yuna-elev-pop);
  -webkit-backdrop-filter: blur(7px) saturate(150%);
  backdrop-filter: blur(7px) saturate(150%);
}

.is-padded {
  padding: 16px;
}
</style>
