<script setup lang="ts">
import { NButton } from 'naive-ui'

/**
 * 查询筛选栏：承载查询条件表单与操作按钮。
 *
 * 条件字段通过默认插槽传入（通常是若干 `n-form-item` 或自适应输入框），
 * 查询/重置按钮可直接使用默认行为并监听事件，也可用 `actions` 插槽完全接管。
 */
interface Props {
  /** 查询按钮 loading 态 */
  loading?: boolean
  /** 是否展示默认的重置按钮 */
  showReset?: boolean
  /** 是否展示默认的查询/重置按钮（置 false 时请使用 actions 插槽） */
  showDefaultActions?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
  showReset: true,
  showDefaultActions: true,
})

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()
</script>

<template>
  <section class="yuna-filter">
    <div class="yuna-filter__fields">
      <slot />
    </div>
    <div class="yuna-filter__actions">
      <slot name="actions">
        <template v-if="showDefaultActions">
          <n-button type="primary" :loading="loading" @click="emit('search')">查询</n-button>
          <n-button v-if="showReset" quaternary @click="emit('reset')">重置</n-button>
        </template>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.yuna-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 14px 16px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.yuna-filter__fields {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.yuna-filter__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

/* 让插槽内的表单控件保持统一宽度基线 */
.yuna-filter__fields :deep(.n-input),
.yuna-filter__fields :deep(.n-base-selection) {
  min-width: 180px;
}
</style>
