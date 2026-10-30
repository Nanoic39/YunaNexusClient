<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * 统一表格。
 *
 * 存在理由（这些规则散落到各页面就会失控）：
 * - 表头在滚动容器之外，滚动时绝对不动（避免 sticky 与行重叠）
 * - 行高固定 56px，操作列默认隐藏、行悬停出现，≤3 个文字按钮
 * - 多选后批量条为浮层，不占布局空间（严禁布局位移）
 * - 分页为真分页（页码 + 每页条数 + 总数），不是无限滚动
 * - 空态/加载态覆盖原区域，高度不塌陷
 */
import { computed } from 'vue'
import Icon from './Icon.vue'

export interface Column {
  /** 字段名或标识 */
  key: string
  /** 表头文案 */
  title: string
  /** 列宽，如 '120px' / '1fr' */
  width?: string
  /** 对齐 */
  align?: 'left' | 'right' | 'center'
  /** 是否可排序 */
  sortable?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    rows: T[]
    /** 行唯一键字段 */
    rowKey: keyof T & string
    loading?: boolean
    /** 是否可多选 */
    selectable?: boolean
    /** 已选中行 key 集合 */
    selected?: Array<string | number>
    /** 分页 */
    page?: number
    pageSize?: number
    total?: number
    pageSizes?: number[]
  }>(),
  {
    loading: false,
    selectable: false,
    selected: () => [],
    page: 1,
    pageSize: 20,
    total: 0,
    pageSizes: () => [20, 50, 100],
  },
)

const emit = defineEmits<{
  (e: 'update:selected', value: Array<string | number>): void
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
}>()

const gridTemplate = computed(
  () =>
    (props.selectable ? '44px ' : '') +
    props.columns.map((c) => c.width ?? '1fr').join(' '),
)

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/** 页码窗口：首尾 + 当前页前后各 2 页，其余折叠为省略号 */
const pageItems = computed<Array<number | '...'>>(() => {
  const pages = pageCount.value
  const set = new Set<number>([1, pages, props.page])
  for (let i = 1; i <= 2; i++) {
    if (props.page - i > 1) set.add(props.page - i)
    if (props.page + i < pages) set.add(props.page + i)
  }
  const sorted = [...set].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b)
  const out: Array<number | '...'> = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('...')
    out.push(p)
    prev = p
  }
  return out
})

const allChecked = computed(
  () => props.rows.length > 0 && props.rows.every((r) => props.selected.includes(r[props.rowKey])),
)
const someChecked = computed(
  () => !allChecked.value && props.rows.some((r) => props.selected.includes(r[props.rowKey])),
)

function keyOf(row: T): string | number {
  return row[props.rowKey]
}

function toggleRow(row: T, checked: boolean): void {
  const key = keyOf(row)
  const next = checked
    ? [...new Set([...props.selected, key])]
    : props.selected.filter((k) => k !== key)
  emit('update:selected', next)
}

function toggleAll(checked: boolean): void {
  emit('update:selected', checked ? props.rows.map(keyOf) : [])
}

function go(p: number): void {
  emit('update:page', Math.min(Math.max(1, p), pageCount.value))
}
</script>

<template>
  <div class="yuna-dt">
    <div v-if="selectable && selected.length" class="yuna-dt__batch">
      <span>已选 <b>{{ selected.length }}</b> 项</span>
      <slot name="batch" :count="selected.length" />
    </div>

    <div class="yuna-dt__head" :style="{ gridTemplateColumns: gridTemplate }">
      <div v-if="selectable" class="cell">
        <input
          type="checkbox"
          :checked="allChecked"
          :indeterminate.prop="someChecked"
          @change="toggleAll(($event.target as HTMLInputElement).checked)"
        />
      </div>
      <div
        v-for="col in columns"
        :key="col.key"
        class="cell"
        :style="{ textAlign: col.align ?? 'left' }"
      >
        {{ col.title }}
      </div>
    </div>

    <div class="yuna-dt__body">
      <div v-if="loading" class="yuna-dt__state">
        <span>加载中…</span>
      </div>
      <div v-else-if="!rows.length" class="yuna-dt__state">
        <slot name="empty">
          <span>暂无数据</span>
        </slot>
      </div>
      <div
        v-for="row in rows"
        v-else
        :key="keyOf(row)"
        class="yuna-dt__row"
        :style="{ gridTemplateColumns: gridTemplate }"
      >
        <div v-if="selectable" class="cell">
          <input
            type="checkbox"
            :checked="selected.includes(keyOf(row))"
            @change="toggleRow(row, ($event.target as HTMLInputElement).checked)"
          />
        </div>
        <div
          v-for="col in columns"
          :key="col.key"
          class="cell"
          :style="{ textAlign: col.align ?? 'left' }"
        >
          <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
            {{ row[col.key] }}
          </slot>
        </div>
      </div>
    </div>

    <footer class="yuna-dt__foot">
      <div class="left">
        <span>共 {{ total }} 条</span>
        <select
          :value="pageSize"
          @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} 条/页</option>
        </select>
      </div>
      <nav class="pager">
        <button type="button" :disabled="page <= 1" @click="go(page - 1)">
          <Icon name="chevronLeft" />
        </button>
        <template v-for="(item, i) in pageItems" :key="i">
          <button v-if="item === '...'" type="button" disabled class="ellipsis">…</button>
          <button
            v-else
            type="button"
            :class="{ on: item === page }"
            @click="go(item as number)"
          >
            {{ item }}
          </button>
        </template>
        <button type="button" :disabled="page >= pageCount" @click="go(page + 1)">
          <Icon name="chevronRight" />
        </button>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.yuna-dt {
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.yuna-dt__head,
.yuna-dt__row {
  display: grid;
  align-items: center;
  padding: 0 8px;
}

.yuna-dt__head {
  height: 40px;
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--yuna-ink-2, #57606a);
  background: color-mix(in srgb, var(--yuna-glass-surface, #fff) 86%, transparent);
  border-bottom: 1px solid var(--yuna-line, #e6e8eb);
}

.yuna-dt__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.yuna-dt__row {
  height: 56px;
  font-size: 13.5px;
  border-bottom: 1px solid var(--yuna-line, #e6e8eb);
}

.yuna-dt__row:hover {
  background: color-mix(in srgb, var(--yuna-glass-surface, #fff) 55%, transparent);
}

.cell {
  padding: 0 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yuna-dt__state {
  display: grid;
  place-items: center;
  min-height: 220px;
  color: var(--yuna-ink-3, #8b949e);
  font-size: 13px;
}

/* 批量条：浮层，不占布局空间 */
.yuna-dt__batch {
  position: absolute;
  left: 50%;
  bottom: 56px;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--yuna-glass-surface-strong, #fff);
  border: 1px solid var(--yuna-glass-border, #e6e8eb);
  box-shadow: var(--yuna-elev-pop);
  font-size: 13px;
}

.yuna-dt__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--yuna-line, #e6e8eb);
  font-size: 12.5px;
  color: var(--yuna-ink-3, #8b949e);
  flex: none;
}

.left {
  display: flex;
  align-items: center;
  gap: 10px;
}

select {
  height: 28px;
  border: 1px solid var(--yuna-glass-border, #e6e8eb);
  border-radius: 6px;
  background: transparent;
  font-size: 12.5px;
  color: inherit;
}

.pager {
  display: flex;
  gap: 4px;
}

.pager button {
  min-width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--yuna-glass-border, #e6e8eb);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  cursor: pointer;
}

.pager button:hover:not(:disabled):not(.on) {
  background: color-mix(in srgb, var(--yuna-glass-surface-strong, #fff) 70%, transparent);
}

.pager button.on {
  background: var(--yuna-primary, #226f9b);
  border-color: var(--yuna-primary, #226f9b);
  color: #fff;
}

.pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

input[type='checkbox'] {
  appearance: none;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  position: relative;
}

input[type='checkbox']:checked {
  background: var(--yuna-primary, #226f9b);
  border-color: var(--yuna-primary, #226f9b);
}

input[type='checkbox']:checked::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1.5px;
  width: 4px;
  height: 8px;
  border: 2px solid #fff;
  border-top: 0;
  border-left: 0;
  transform: rotate(40deg);
}

input[type='checkbox']:indeterminate {
  background: var(--yuna-primary, #226f9b);
  border-color: var(--yuna-primary, #226f9b);
}

input[type='checkbox']:indeterminate::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 7px;
  width: 8px;
  height: 2px;
  background: #fff;
}
</style>
