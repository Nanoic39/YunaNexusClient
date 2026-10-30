<script setup lang="ts">
/**
 * 用户管理（对齐后端 GET /api/v1/auth/admin/users）。
 *
 * 后端支持 keyword / status / roleId / permissionId / page / size。
 * 页面只做列表与基础操作，复杂编辑后续以抽屉形式补充。
 */
import { computed, onMounted, ref } from 'vue'
import { DataTable, PageHeader, Surface, type Column } from '@yuna/ui'
import { adminUserApi, type AdminUserView } from '@/api/admin-users'

const columns: Column[] = [
  { key: 'userId', title: '用户 ID', width: '100px' },
  { key: 'username', title: '用户', width: '1.6fr' },
  { key: 'status', title: '状态', width: '110px' },
  { key: 'lastLoginTime', title: '最近登录', width: '180px' },
  { key: 'failCount', title: '失败次数', width: '100px', align: 'right' },
  { key: 'ops', title: '操作', width: '150px', align: 'right' },
]

const rows = ref<AdminUserView[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const status = ref<number | undefined>()
const loading = ref(false)
const error = ref('')

const selected = computed<Array<string | number>>({
  get: () => [],
  set: () => undefined,
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await adminUserApi.list({
      keyword: keyword.value.trim() || undefined,
      status: status.value,
      page: page.value,
      size: pageSize.value,
    })
    rows.value = result.records ?? []
    total.value = result.total ?? 0
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function changePage(next: number): void {
  page.value = next
  void load()
}

function changeSize(next: number): void {
  pageSize.value = next
  page.value = 1
  void load()
}

function statusText(s: number): string {
  return s === 1 ? '正常' : s === 2 ? '已锁定' : '已禁用'
}

function statusClass(s: number): string {
  return s === 1 ? 'ok' : s === 2 ? 'warn' : 'off'
}

async function disable(row: AdminUserView): Promise<void> {
  await adminUserApi.disable(row.userId)
  await load()
}

async function unlock(row: AdminUserView): Promise<void> {
  await adminUserApi.unlock(row.userId)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="用户管理" :description="`共 ${total} 位用户`">
      <template #actions>
        <button class="btn">导出</button>
        <button class="btn btn-primary">新建用户</button>
      </template>
    </PageHeader>

    <Surface :padded="false" class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="search"
          placeholder="搜索用户名或邮箱"
          @keyup.enter="search"
        />
        <select :value="status ?? ''" @change="status = ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : undefined; search()">
          <option value="">全部状态</option>
          <option :value="1">正常</option>
          <option :value="2">已锁定</option>
          <option :value="0">已禁用</option>
        </select>
        <button class="btn" @click="search">查询</button>
        <div class="grow" />
        <span v-if="error" class="error">{{ error }}</span>
      </div>

      <DataTable
        v-model:selected="selected"
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
          <span class="pill" :class="statusClass((row as AdminUserView).status)">
            <i />{{ statusText((row as AdminUserView).status) }}
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
            <button class="link">编辑</button>
            <button class="link" @click="unlock(row as AdminUserView)">解锁</button>
            <button class="link danger" @click="disable(row as AdminUserView)">禁用</button>
          </div>
        </template>
      </DataTable>
    </Surface>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.card {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--yuna-line, #e6e8eb);
  flex: none;
}

.search,
select {
  height: 32px;
  padding: 0 10px;
  font-size: 13px;
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 6px;
  background: color-mix(in srgb, var(--yuna-glass-surface-strong) 70%, transparent);
  color: inherit;
  outline: none;
}

.search {
  width: 240px;
}

.search:focus {
  border-color: var(--yuna-primary, #226f9b);
}

.btn {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  border: 1px solid var(--yuna-glass-border, #d8dde3);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.btn-primary {
  background: var(--yuna-primary, #226f9b);
  border-color: var(--yuna-primary, #226f9b);
  color: #fff;
}

.grow {
  flex: 1;
}

.error {
  font-size: 12.5px;
  color: var(--yuna-danger, #c3313a);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--yuna-primary, #226f9b);
  background: color-mix(in srgb, var(--yuna-primary, #226f9b) 12%, #fff);
}

.name {
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.3;
}

.sub {
  font-size: 12.5px;
  color: var(--yuna-ink-3, #8b949e);
  line-height: 1.3;
}

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--yuna-ink-3, #8b949e);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 12px;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.pill i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.pill.ok {
  color: #16794f;
}

.pill.warn {
  color: #946200;
}

.pill.off {
  color: #64748b;
}

.ops {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0;
}

:deep(.yuna-dt__row:hover) .ops {
  opacity: 1;
}

.link {
  border: 0;
  background: transparent;
  color: var(--yuna-primary, #226f9b);
  font-size: 13px;
  padding: 0 6px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
}

.link:hover {
  background: color-mix(in srgb, var(--yuna-primary, #226f9b) 10%, transparent);
}

.link.danger {
  color: var(--yuna-danger, #c3313a);
}

.link.danger:hover {
  background: color-mix(in srgb, var(--yuna-danger, #c3313a) 8%, transparent);
}
</style>
