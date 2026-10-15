<script setup lang="ts">
/**
 * 页面容器：统一页面的标题区、操作区与内容边距。
 *
 * 业务页面只需提供标题/描述，操作按钮走 `extra` 插槽，避免每页重复排版。
 */
interface Props {
  title?: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="yuna-page yuna-container">
    <header
      v-if="title || description || $slots.extra || $slots.breadcrumb"
      class="yuna-page__head"
    >
      <div class="yuna-page__head-main">
        <slot name="breadcrumb" />
        <h1 v-if="title" class="yuna-page__title">{{ title }}</h1>
        <p v-if="description" class="yuna-page__desc">{{ description }}</p>
      </div>
      <div v-if="$slots.extra" class="yuna-page__extra">
        <slot name="extra" />
      </div>
    </header>

    <div v-if="$slots.tabs" class="yuna-page__tabs">
      <slot name="tabs" />
    </div>

    <div class="yuna-page__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.yuna-page {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 28px 40px;
}

.yuna-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.yuna-page__head-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.yuna-page__title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--yuna-gray-900);
}

.yuna-page__desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--yuna-gray-600);
}

.yuna-page__extra {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.yuna-page__tabs {
  margin-bottom: -4px;
}

.yuna-page__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* 窄屏：收紧边距，标题与操作区改为纵向堆叠 */
@media (max-width: 768px) {
  .yuna-page {
    gap: 14px;
    padding: 16px 16px 32px;
  }

  .yuna-page__head {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .yuna-page__extra {
    flex-wrap: wrap;
  }
}
</style>
