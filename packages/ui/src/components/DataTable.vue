<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import { NDataTable, NEmpty, NPagination } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'

/**
 * 数据表封装：统一斑马纹、空态文案与底部分页。
 *
 * 分页采用「受控 + 事件」模式（`update:page` / `update:size` / `change`），
 * 便于页面直接驱动后端分页查询。其余 `n-data-table` 属性通过 `v-bind="$attrs"` 透传。
 */
defineOptions({ inheritAttrs: false })

interface Props {
  columns: DataTableColumns<T>
  data: T[]
  loading?: boolean
  /** 总记录数（后端分页 total） */
  total?: number
  page?: number
  size?: number
  pageSizes?: number[]
  rowKey?: (row: T) => DataTableRowKey
  scrollX?: number
  emptyDescription?: string
  /** 是否展示分页器；缺省时在 total > size 时自动展示 */
  showPagination?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  total: 0,
  page: 1,
  size: 20,
  pageSizes: () => [10, 20, 50, 100],
  rowKey: undefined,
  scrollX: undefined,
  emptyDescription: '暂无数据',
  showPagination: undefined,
})

const emit = defineEmits<{
  (e: 'update:page', page: number): void
  (e: 'update:size', size: number): void
  (e: 'change', payload: { page: number; size: number }): void
}>()

const showPager = computed(() => props.showPagination ?? props.total > props.size)

function onPageChange(next: number): void {
  emit('update:page', next)
  emit('change', { page: next, size: props.size })
}

function onSizeChange(nextSize: number): void {
  emit('update:size', nextSize)
  emit('update:page', 1)
  emit('change', { page: 1, size: nextSize })
}
</script>

<template>
  <div class="yuna-table">
    <n-data-table
      v-bind="$attrs"
      :columns="columns"
      :data="data"
      :loading="loading"
      :row-key="rowKey"
      :scroll-x="scrollX"
      :bordered="false"
      :single-line="false"
      :remote="true"
      :pagination="false"
      striped
      size="medium"
    >
      <template #empty>
        <n-empty class="yuna-table__empty" :description="emptyDescription" />
      </template>
    </n-data-table>

    <div v-if="showPager" class="yuna-table__footer">
      <n-pagination
        :page="page"
        :page-size="size"
        :item-count="total"
        :page-sizes="pageSizes"
        :page-slot="7"
        show-size-picker
        @update:page="onPageChange"
        @update:page-size="onSizeChange"
      />
    </div>
  </div>
</template>

<style scoped>
.yuna-table {
  overflow: hidden;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.yuna-table__empty {
  padding: 32px 0;
}

.yuna-table__footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--yuna-gray-200);
}
</style>
