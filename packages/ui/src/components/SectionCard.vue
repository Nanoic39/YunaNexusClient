<script setup lang="ts">
/**
 * 区块卡片：带标题的内容分区，用于把概览/详情页拆成若干语义区块。
 *
 * 与 Naive `NCard` 的区别在于统一的头部排版（标题 + 描述 + 右侧操作），
 * 且以「无描边 + 弱阴影」的现代 SaaS 卡片表面贴合内容区画布。
 */
interface Props {
  title?: string
  description?: string
  /** 去掉内边距，便于放置表格等自带边框的内容 */
  flush?: boolean
}

withDefaults(defineProps<Props>(), {
  flush: false,
})
</script>

<template>
  <section class="yuna-section">
    <header v-if="title || description || $slots.extra" class="yuna-section__head">
      <div class="yuna-section__head-main">
        <h2 v-if="title" class="yuna-section__title">{{ title }}</h2>
        <p v-if="description" class="yuna-section__desc">{{ description }}</p>
      </div>
      <div v-if="$slots.extra" class="yuna-section__extra">
        <slot name="extra" />
      </div>
    </header>
    <div class="yuna-section__body" :class="{ 'is-flush': flush }">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.yuna-section {
  overflow: hidden;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.yuna-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--yuna-gray-100);
}

.yuna-section__head-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.yuna-section__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--yuna-gray-900);
}

.yuna-section__desc {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.yuna-section__extra {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.yuna-section__body {
  padding: 24px;
}

.yuna-section__body.is-flush {
  padding: 0;
}
</style>
