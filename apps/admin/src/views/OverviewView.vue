<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  DataTable,
  MetricCard,
  PageContainer,
  SectionCard,
  StatusTag,
  appealStatusMeta,
  formatDateTime,
  formatRelative,
  userStatusMeta,
} from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import type { AdminUserView, AppealView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()

const metricsLoading = ref(true)
const listsLoading = ref(true)

const userTotal = ref<number | null>(null)
const userEnabled = ref<number | null>(null)
const userDisabled = ref<number | null>(null)
const appealPending = ref<number | null>(null)

const pendingAppeals = ref<AppealView[]>([])
const recentUsers = ref<AdminUserView[]>([])

const appealColumns: DataTableColumns<AppealView> = [
  {
    title: '用户',
    key: 'username',
    width: 140,
    render: (row) => row.username ?? '—',
  },
  {
    title: '申诉理由',
    key: 'appealReason',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: (row) => row.appealReason ?? '—',
  },
  {
    title: '提交时间',
    key: 'createTime',
    width: 172,
    render: (row) => formatDateTime(row.createTime),
  },
  {
    title: '状态',
    key: 'status',
    width: 96,
    render: (row) => h(StatusTag, { meta: appealStatusMeta(row.status) }),
  },
]

const userColumns: DataTableColumns<AdminUserView> = [
  {
    title: '用户',
    key: 'username',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.username),
        h('span', { class: 'yuna-cell__sub' }, row.email ?? row.mobile ?? '—'),
      ]),
  },
  {
    title: '状态',
    key: 'status',
    width: 96,
    render: (row) => h(StatusTag, { meta: userStatusMeta(row.status) }),
  },
  {
    title: '最近登录',
    key: 'lastLoginTime',
    width: 172,
    render: (row) => formatRelative(row.lastLoginTime),
  },
]

async function loadMetrics(): Promise<void> {
  metricsLoading.value = true
  try {
    const [all, enabled, disabled, pending] = await Promise.all([
      authAdminApi.listUsers({ page: 1, size: 1 }),
      authAdminApi.listUsers({ page: 1, size: 1, status: 1 }),
      authAdminApi.listUsers({ page: 1, size: 1, status: 0 }),
      authAdminApi.listAppeals({ page: 1, size: 1, status: 0 }),
    ])
    userTotal.value = all.total
    userEnabled.value = enabled.total
    userDisabled.value = disabled.total
    appealPending.value = pending.total
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    metricsLoading.value = false
  }
}

async function loadLists(): Promise<void> {
  listsLoading.value = true
  try {
    const [appeals, users] = await Promise.all([
      authAdminApi.listAppeals({ page: 1, size: 5, status: 0 }),
      authAdminApi.listUsers({ page: 1, size: 5 }),
    ])
    pendingAppeals.value = appeals.records
    recentUsers.value = users.records
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    listsLoading.value = false
  }
}

function refresh(): void {
  void loadMetrics()
  void loadLists()
}

onMounted(refresh)
</script>

<template>
  <page-container title="概览" description="平台关键指标与近期待办事项">
    <template #extra>
      <n-button quaternary :loading="metricsLoading || listsLoading" @click="refresh">刷新</n-button>
    </template>

    <div class="yuna-metric-grid">
      <metric-card label="用户总数" :value="userTotal" unit="个" :loading="metricsLoading" />
      <metric-card label="正常账号" :value="userEnabled" unit="个" :loading="metricsLoading" />
      <metric-card label="禁用账号" :value="userDisabled" unit="个" :loading="metricsLoading" />
      <metric-card label="待处理申诉" :value="appealPending" unit="条" :loading="metricsLoading" />
    </div>

    <section-card title="待处理申诉" description="按提交时间倒序展示最近 5 条" flush>
      <template #extra>
        <n-button text type="primary" @click="router.push('/users')">查看用户</n-button>
      </template>
      <data-table
        :columns="appealColumns"
        :data="pendingAppeals"
        :loading="listsLoading"
        :row-key="(row: AppealView) => row.id"
        :scroll-x="680"
        empty-description="暂无待处理申诉"
      />
    </section-card>

    <section-card title="最近登录" description="最近活跃的 5 个账号" flush>
      <data-table
        :columns="userColumns"
        :data="recentUsers"
        :loading="listsLoading"
        :row-key="(row: AdminUserView) => row.userId"
        :scroll-x="560"
        empty-description="暂无登录记录"
      />
    </section-card>
  </page-container>
</template>
