<script setup lang="ts">
import { onUnmounted } from 'vue'
import {
  DataTable,
  PageHeader,
  Surface,
  Icon,
  registerContextMenuProvider,
  type Column,
  type ContextMenuItem,
} from '@yuna/ui'
import type { AdminUserView } from '@yuna/core/types'
import { useUserList } from '../composables/useUserList'
const {
  load,
  rows,
  total,
  page,
  pageSize,
  keyword,
  status,
  loading,
  error,
  acting,
  search,
  changePage,
  changeSize,
  changeStatus,
  statusText,
  statusClass,
  disable,
  unlock,
} = useUserList()
const columns: Column[] = [
  { key: 'userId', title: '用户 ID', width: '100px' },
  { key: 'username', title: '用户', width: '1.6fr' },
  { key: 'status', title: '状态', width: '110px' },
  { key: 'lastLoginTime', title: '最近登录', width: '180px' },
  { key: 'failCount', title: '失败次数', width: '100px', align: 'right' },
  { key: 'ops', title: '操作', width: '150px', align: 'right' },
]

// 用户行右键菜单由本页面自己决定，不进入全局默认菜单
const offRowMenu = registerContextMenuProvider('admin-user-row', (context) => {
  const row = context.payload as AdminUserView | undefined
  if (!row) return null
  const items: ContextMenuItem[] = [
    { key: 'edit', label: '编辑', onSelect: () => undefined },
    { key: 'unlock', label: '解锁', onSelect: () => unlock(row) },
    { key: 'sep', divider: true },
    { key: 'disable', label: '禁用账号', danger: true, onSelect: () => disable(row) },
  ]
  return items
})
onUnmounted(offRowMenu)
</script>

<template>
  <div class="page">
    <PageHeader title="用户管理" description="管理平台账户与访问状态。"
      ><template #actions
        ><button class="workspace-button" :disabled="loading" @click="load">
          <Icon name="refresh" :size="14" />刷新列表
        </button></template
      ></PageHeader
    >

    <Surface :padded="false" class="card">
      <div class="toolbar">
        <div class="search-field">
          <Icon name="search" /><input
            v-model="keyword"
            class="search"
            placeholder="搜索用户名或邮箱"
            aria-label="搜索用户名或邮箱"
            @keyup.enter="search"
          />
        </div>
        <select
          :value="status ?? ''"
          @change="changeStatus(($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部状态</option>
          <option :value="1">正常</option>
          <option :value="0">已禁用</option>
        </select>
        <button class="workspace-button" @click="search">查询</button>
        <div class="grow" />
        <span v-if="error" role="alert" class="error"
          >{{ error }} <button class="link" @click="load">重试</button></span
        >
      </div>

      <div class="table-viewport">
        <DataTable
          row-context-kind="admin-user-row"
          :selectable="false"
          :columns="columns"
          :rows="rows"
          row-key="userId"
          :loading="loading"
          :page="page"
          :page-size="pageSize"
          :total="total"
          @update:page="changePage"
          @update:page-size="changeSize"
        >
          <template #cell-userId="{ row }">
            <span class="mono">{{ (row as AdminUserView).userId }}</span>
          </template>
          <template #cell-username="{ row }">
            <div class="user">
              <span class="avatar">{{ (row as AdminUserView).username.slice(0, 1) }}</span>
              <div>
                <div class="name">{{ (row as AdminUserView).username }}</div>
                <div class="sub">{{ (row as AdminUserView).email || '—' }}</div>
              </div>
            </div>
          </template>
          <template #cell-status="{ row }">
            <span
              class="pill"
              :class="
                statusClass((row as AdminUserView).status, (row as AdminUserView).lockedUntil)
              "
            >
              <i />{{
                statusText((row as AdminUserView).status, (row as AdminUserView).lockedUntil)
              }}
            </span>
          </template>
          <template #cell-lastLoginTime="{ row }">
            {{ (row as AdminUserView).lastLoginTime?.replace('T', ' ').slice(0, 16) || '从未登录' }}
          </template>
          <template #cell-failCount="{ row }">
            {{ (row as AdminUserView).failCount ?? 0 }}
          </template>
          <template #cell-ops="{ row }">
            <div class="ops">
              <button :disabled="acting" class="link" @click="unlock(row as AdminUserView)">
                解锁
              </button>
              <button
                :disabled="acting || (row as AdminUserView).status === 0"
                class="link danger"
                @click="disable(row as AdminUserView)"
              >
                禁用
              </button>
            </div>
          </template>
        </DataTable>
      </div>
    </Surface>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--ws-gap-5);
  min-height: 0;
}
.card {
  min-width: 0;
  overflow: hidden;
  min-height: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--yuna-space-3);
  padding: var(--yuna-space-4);
  border-bottom: 1px solid var(--ws-line);
}
.search,
select,
.btn {
  min-height: var(--yuna-control-height);
  padding: var(--yuna-space-2) var(--yuna-space-4);
  font: inherit;
  font-size: var(--ws-font-control);
  color: var(--ws-ink);
  background: var(--ws-surface);
  border: 1px solid var(--ws-line);
  border-radius: var(--yuna-radius-md);
}
.search-field {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
  padding-left: var(--ws-gap-3);
  border: 1px solid var(--ws-line);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
  color: var(--ws-faint);
}
.search-field:focus-within {
  border-color: var(--yuna-primary);
}
.search-field .search {
  border: 0;
  padding-left: 0;
  background: transparent;
  outline: none;
}
.search {
  min-width: 0;
  width: min(100%, var(--yuna-search-width));
}
.btn {
  cursor: pointer;
}
.grow {
  flex: 1;
}
.error {
  color: var(--yuna-danger);
}
.user {
  display: flex;
  align-items: center;
  gap: var(--yuna-space-3);
}
.avatar {
  display: grid;
  place-items: center;
  width: var(--yuna-avatar-size);
  height: var(--yuna-avatar-size);
  flex: none;
  border-radius: var(--yuna-radius-pill);
  background: var(--yuna-primary-soft);
  color: var(--yuna-primary);
}
.user > div {
  min-width: 0;
}
.sub {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.name {
  font-weight: 600;
}
.sub,
.mono {
  color: var(--ws-muted);
  font-size: var(--yuna-font-size-sm);
}
.mono {
  font-variant-numeric: tabular-nums;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--yuna-space-2);
  padding: var(--yuna-space-2) var(--yuna-space-3);
  border-radius: var(--yuna-radius-pill);
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: var(--yuna-font-size-sm);
}
.pill i {
  width: var(--yuna-space-2);
  height: var(--yuna-space-2);
  border-radius: var(--yuna-radius-pill);
  background: currentColor;
}
.pill.ok {
  color: var(--yuna-success);
}
.pill.warn {
  color: var(--yuna-warning);
}
.pill.off {
  color: var(--ws-muted);
}
.ops {
  display: flex;
  gap: var(--yuna-space-2);
  justify-content: flex-end;
}
.link {
  border: 0;
  background: transparent;
  color: var(--yuna-primary);
  font: inherit;
  font-size: var(--ws-font-control);
  padding: var(--yuna-space-2);
  min-height: var(--yuna-control-height);
  border-radius: var(--yuna-radius-md);
  cursor: pointer;
}
.link:hover {
  background: var(--yuna-primary-soft);
}
.link.danger {
  color: var(--yuna-danger);
}
.link.danger:hover {
  background: var(--yuna-danger-soft);
}
.link:disabled {
  opacity: 0.5;
  cursor: wait;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: var(--yuna-focus-ring);
  outline-offset: var(--yuna-space-1);
}

:deep(.yuna-dt) {
  min-width: var(--ws-table-min-width);
}

.table-viewport {
  overflow-x: auto;
  container-type: inline-size;
  overscroll-behavior-inline: contain;
}
.search-field {
  max-width: 100%;
}
@container (max-width: 800px) {
  :deep(.yuna-dt) {
    min-width: 520px;
  }
  :deep(.yuna-dt__head),
  :deep(.yuna-dt__row) {
    grid-template-columns: minmax(170px, 1fr) 90px 148px 112px !important;
  }
  :deep(.yuna-dt__head > .cell:nth-child(1)),
  :deep(.yuna-dt__head > .cell:nth-child(5)),
  :deep(.yuna-dt__row > .cell:nth-child(1)),
  :deep(.yuna-dt__row > .cell:nth-child(5)) {
    display: none;
  }
}
</style>
