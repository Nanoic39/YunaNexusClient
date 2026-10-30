<script setup lang="ts">
/**
 * 页面标题区。
 *
 * 不包含面包屑：侧栏选中态已表达位置，面包屑在三级以内属重复信息。
 * 左侧标题 + 说明，右侧操作区（主操作只能有一个）。
 */
defineProps<{
  title: string
  /** 副标题：数量统计等，非必要不写 */
  description?: string
}>()
</script>

<template>
  <header class="yuna-page-header">
    <div class="meta">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.yuna-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: var(--yuna-ink, #1f2328);
}

p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--yuna-ink-3, #8b949e);
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
