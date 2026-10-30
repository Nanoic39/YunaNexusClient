<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import { NDataTable, NEmpty, NPagination } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import { openContextMenu } from '../composables/use-context-menu'
import type { ContextMenuItem } from '../composables/use-context-menu'

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
  /**
   * 行右键菜单构建器。
   *
   * 传入后该行右键弹出业务菜单；返回值里不需要重复"复制"类通用项，外壳会自动补齐。
   * 不传则只提供通用项（复制整行 / 复制单元格 / 刷新），保证每张表都有可用的右键。
   */
  rowContextMenu?: (row: T, cell: { key: string; title: string; text: string }) => ContextMenuItem[]
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
  rowContextMenu: undefined,
})

const emit = defineEmits<{
  (e: 'update:page', page: number): void
  (e: 'update:size', size: number): void
  (e: 'change', payload: { page: number; size: number }): void
  (e: 'refresh'): void
}>()

/* ------------------------------------------------------------ 行右键菜单 */

/** 表头顺序与列 key/title 的映射，用于把单元格映射回列定义 */
function columnAt(cellIndex: number): { key: string; title: string; index: number } {
  const columns = (props.columns ?? []) as unknown as Array<{ key?: string; title?: string }>
  const entry = columns[cellIndex]
  return {
    key: entry?.key != null ? String(entry.key) : '',
    title: entry?.title != null ? String(entry.title) : '',
    index: cellIndex,
  }
}

function cellText(target: Element): string {
  return (target.textContent ?? '').trim().replace(/\s+/g, ' ')
}

/**
 * 从 DOM 反查命中的行与列。
 *
 * `n-data-table` 不对外暴露行属性，只能按结构定位：表格主体内第 N 个 `tr` 对应
 * `data[N]`。这里做了三层兜底，任何一层拿不到就退化为"无行上下文"，绝不抛错。
 */
function resolveRow(
  target: Element,
): { row: T; cell: { key: string; title: string; text: string } } | null {
  const table = target.closest('.n-data-table') as HTMLElement | null
  const rowElement = target.closest('.n-data-table-tr')
  if (!table || !rowElement) return null
  const body = table.querySelector('.n-data-table-tbody')
  if (!body || !body.contains(rowElement)) return null
  const rows = Array.from(body.querySelectorAll('.n-data-table-tr'))
  const rowIndex = rows.indexOf(rowElement)
  if (rowIndex < 0 || rowIndex >= props.data.length) return null
  const cells = Array.from(rowElement.querySelectorAll('.n-data-table-td'))
  const cellElement = target.closest('.n-data-table-td')
  const cellIndex = cellElement ? cells.indexOf(cellElement) : -1
  const column = cellIndex >= 0 ? columnAt(cellIndex) : { key: '', title: '', index: -1 }
  return {
    row: props.data[rowIndex],
    cell: { key: column.key, title: column.title, text: cellElement ? cellText(cellElement) : '' },
  }
}

function genericRowItems(
  row: T,
  cell: { key: string; title: string; text: string },
): ContextMenuItem[] {
  const items: ContextMenuItem[] = []
  if (cell.text) {
    items.push({
      key: 'copy-cell',
      label: cell.title ? `复制「${cell.title}」内容` : '复制单元格内容',
      icon: 'copy',
      onSelect: () => {
        void navigator.clipboard?.writeText(cell.text).catch(() => {})
      },
    })
  }
  items.push({
    key: 'copy-row',
    label: '复制整行（JSON）',
    icon: 'copy',
    onSelect: () => {
      void navigator.clipboard?.writeText(JSON.stringify(row, null, 2)).catch(() => {})
    },
  })
  if (props.rowKey) {
    const key = props.rowKey(row)
    if (typeof key === 'string' || typeof key === 'number') {
      items.push({
        key: 'copy-key',
        label: '复制主键',
        icon: 'link',
        onSelect: () => {
          void navigator.clipboard?.writeText(String(key)).catch(() => {})
        },
      })
    }
  }
  items.push({
    key: 'refresh',
    label: '刷新列表',
    icon: 'refresh',
    divider: true,
    onSelect: () => emit('refresh'),
  })
  return items
}

function onRowContextMenu(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const hit = resolveRow(target)
  if (!hit) return
  event.preventDefault()
  event.stopPropagation()
  const custom = props.rowContextMenu?.(hit.row, hit.cell) ?? []
  const items = custom.length
    ? [...custom, { key: 'generic-divider', divider: true }, ...genericRowItems(hit.row, hit.cell)]
    : genericRowItems(hit.row, hit.cell)
  openContextMenu({ x: event.clientX, y: event.clientY, items, opener: null })
}

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
  <div class="yuna-table" @contextmenu="onRowContextMenu">
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
      size="small"
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
        :page-slot="5"
        show-size-picker
        @update:page="onPageChange"
        @update:page-size="onSizeChange"
      />
    </div>
  </div>
</template>

<style scoped>
.yuna-table {
  min-width: 0;
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

@media (max-width: 640px) {
  .yuna-table__footer {
    overflow-x: auto;
    justify-content: flex-start;
    padding: 10px;
  }
}
</style>
