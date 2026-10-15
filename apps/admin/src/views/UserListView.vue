<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NSelect, NTooltip, useDialog, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  formatDateTime,
  formatRelative,
  truncateMiddle,
  userStatusMeta,
} from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import type { AdminUserView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

type UserAction = 'enable' | 'disable' | 'unlock' | 'kick'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const actionApi: Record<UserAction, (userId: number) => Promise<void>> = {
  enable: authAdminApi.enableUser,
  disable: authAdminApi.disableUser,
  unlock: authAdminApi.unlockUser,
  kick: authAdminApi.kickUser,
}

const actionLabel: Record<UserAction, string> = {
  enable: '启用',
  disable: '禁用',
  unlock: '解锁',
  kick: '踢下线',
}

const filters = reactive<{ keyword: string; status: number | null }>({
  keyword: '',
  status: null,
})

const rows = ref<AdminUserView[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
]

/** `lockedUntil` 有值即视为处于锁定/待解锁状态 */
const hasLock = (row: AdminUserView): boolean => row.lockedUntil !== null

function renderStatus(row: AdminUserView) {
  const tags = [h(StatusTag, { meta: userStatusMeta(row.status) })]
  if (hasLock(row)) {
    tags.push(
      h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () => h(StatusTag, { tone: 'warning', text: '已锁定' }),
          default: () => row.lockReason ?? '账号已被锁定',
        },
      ),
    )
  }
  return h('div', { class: 'yuna-cell-actions' }, tags)
}

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(
    NButton,
    { size: 'small', secondary: true, type, onClick },
    { default: () => label },
  )
}

function renderActions(row: AdminUserView) {
  const nodes = [
    row.status === 1
      ? actionButton('禁用', () => confirmAction(row, 'disable'))
      : actionButton('启用', () => confirmAction(row, 'enable'), 'primary'),
  ]
  if (hasLock(row)) nodes.push(actionButton('解锁', () => confirmAction(row, 'unlock'), 'primary'))
  nodes.push(actionButton('踢下线', () => confirmAction(row, 'kick')))
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, nodes)
}

const columns: DataTableColumns<AdminUserView> = [
  {
    title: '用户',
    key: 'username',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.username),
        h('span', { class: 'yuna-cell__sub' }, truncateMiddle(row.externalId)),
      ]),
  },
  {
    title: '邮箱',
    key: 'email',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: (row) => row.email ?? '—',
  },
  {
    title: '手机',
    key: 'mobile',
    width: 150,
    render: (row) =>
      row.mobile ? `${row.mobileCountry ? `+${row.mobileCountry} ` : ''}${row.mobile}` : '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 150,
    render: renderStatus,
  },
  {
    title: '最近登录',
    key: 'lastLoginTime',
    width: 180,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, formatRelative(row.lastLoginTime)),
        h('span', { class: 'yuna-cell__sub' }, row.lastLoginIp ?? '—'),
      ]),
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 172,
    render: (row) => formatDateTime(row.createTime),
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await authAdminApi.listUsers({
      page: page.value,
      size: size.value,
      keyword: filters.keyword.trim() || undefined,
      status: filters.status ?? undefined,
    })
    rows.value = result.records
    total.value = result.total
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

async function runAction(user: AdminUserView, action: UserAction): Promise<void> {
  const label = actionLabel[action]
  try {
    await actionApi[action](user.userId)
    message.success(`${label}成功`)
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  }
}

function confirmAction(user: AdminUserView, action: UserAction): void {
  const label = actionLabel[action]
  dialog.warning({
    title: `${label}账号`,
    content: `确认对「${user.username}」执行${label}操作？`,
    positiveText: label,
    negativeText: '取消',
    onPositiveClick: () => runAction(user, action),
  })
}

function search(): void {
  page.value = 1
  void load()
}

function reset(): void {
  filters.keyword = ''
  filters.status = null
  page.value = 1
  void load()
}

function onPageChange(next: number): void {
  page.value = next
  void load()
}

function onSizeChange(next: number): void {
  size.value = next
  page.value = 1
  void load()
}

onMounted(load)
</script>

<template>
  <page-container title="用户管理" description="查询账号状态并执行启用、禁用、解锁与会话撤销">
    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="filters.keyword"
        placeholder="用户名 / 邮箱 / 手机号"
        clearable
        style="width: 240px"
        @keyup.enter="search"
      />
      <n-select
        v-model:value="filters.status"
        :options="statusOptions"
        placeholder="全部状态"
        clearable
        style="width: 150px"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :size="size"
      :row-key="(row: AdminUserView) => row.userId"
      :scroll-x="1300"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />
  </page-container>
</template>
