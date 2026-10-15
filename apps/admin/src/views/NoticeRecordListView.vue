<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NInput,
  NModal,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  formatDateTime,
  noticeChannelText,
} from '@yuna/ui'
import type { StatusMeta } from '@yuna/ui'
import { noticeAdminApi } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()

/** 管理端视角的记录状态语义（与用户端「未读」措辞区分） */
function recordStatusMeta(status: number | null | undefined): StatusMeta {
  switch (status) {
    case 0:
      return { tone: 'warning', text: '待发送' }
    case 1:
      return { tone: 'success', text: '已发送' }
    case 2:
      return { tone: 'danger', text: '发送失败' }
    case 3:
      return { tone: 'default', text: '已读' }
    default:
      return { tone: 'default', text: '未知' }
  }
}

const statusOptions = [
  { label: '待发送', value: 0 },
  { label: '已发送', value: 1 },
  { label: '发送失败', value: 2 },
  { label: '已读', value: 3 },
]

const rows = ref<NoticeRecordView[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)

const filters = ref<{ templateCode: string; receiver: string; status: number | null }>({
  templateCode: '',
  receiver: '',
  status: null,
})

function renderActions(row: NoticeRecordView) {
  return h(
    NButton,
    { size: 'small', secondary: true, type: 'primary', onClick: () => openDetail(row) },
    { default: () => '详情' },
  )
}

const columns: DataTableColumns<NoticeRecordView> = [
  {
    title: '通知 ID',
    key: 'noticeId',
    width: 120,
    render: (row) => row.noticeId,
  },
  {
    title: '模板编码',
    key: 'templateCode',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: (row) => row.templateCode || '—',
  },
  {
    title: '通道',
    key: 'channel',
    width: 100,
    render: (row) => row.channelLabel || noticeChannelText(row.channel),
  },
  {
    title: '接收方',
    key: 'receiver',
    minWidth: 160,
    ellipsis: { tooltip: true },
    render: (row) => row.receiver || '—',
  },
  {
    title: '标题',
    key: 'title',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: (row) => row.title || '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: recordStatusMeta(row.status) }),
  },
  {
    title: '发送时间',
    key: 'sendTime',
    width: 172,
    render: (row) => formatDateTime(row.sendTime),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await noticeAdminApi.listRecords({
      page: page.value,
      size: size.value,
      templateCode: filters.value.templateCode.trim() || undefined,
      receiver: filters.value.receiver.trim() || undefined,
      status: filters.value.status ?? undefined,
    })
    rows.value = result.records
    total.value = result.total
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function reset(): void {
  filters.value = { templateCode: '', receiver: '', status: null }
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

/* ------------------------------ 详情 ------------------------------ */

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<NoticeRecordView | null>(null)

async function openDetail(row: NoticeRecordView): Promise<void> {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = row
  try {
    detail.value = await noticeAdminApi.record(row.noticeId)
  } catch (error) {
    message.error(handleApiError(error, router))
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <page-container title="发送记录" description="按模板编码、接收方与状态检索通知投递明细">
    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="filters.templateCode"
        placeholder="模板编码"
        clearable
        style="width: 200px"
        @keyup.enter="search"
      />
      <n-input
        v-model:value="filters.receiver"
        placeholder="接收方"
        clearable
        style="width: 200px"
        @keyup.enter="search"
      />
      <n-select
        v-model:value="filters.status"
        :options="statusOptions"
        placeholder="全部状态"
        clearable
        style="width: 160px"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :size="size"
      :row-key="(row: NoticeRecordView) => row.id"
      :scroll-x="1200"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />

    <n-modal
      v-model:show="detailVisible"
      preset="card"
      title="通知详情"
      style="width: 640px; max-width: calc(100vw - 32px)"
    >
      <n-descriptions
        v-if="detail"
        :column="1"
        label-placement="left"
        label-align="right"
        :label-style="{ width: '96px' }"
      >
        <n-descriptions-item label="通知 ID">{{ detail.noticeId }}</n-descriptions-item>
        <n-descriptions-item label="模板编码">
          {{ detail.templateCode || '—' }}
        </n-descriptions-item>
        <n-descriptions-item label="通道">
          {{ detail.channelLabel || noticeChannelText(detail.channel) }}
        </n-descriptions-item>
        <n-descriptions-item label="接收方">{{ detail.receiver || '—' }}</n-descriptions-item>
        <n-descriptions-item label="状态">
          <status-tag :meta="recordStatusMeta(detail.status)" />
        </n-descriptions-item>
        <n-descriptions-item label="重试次数">
          {{ detail.retryCount ?? 0 }}
        </n-descriptions-item>
        <n-descriptions-item label="发送时间">
          {{ formatDateTime(detail.sendTime) }}
        </n-descriptions-item>
        <n-descriptions-item label="创建时间">
          {{ formatDateTime(detail.createTime) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detail.errorMsg" label="错误信息">
          {{ detail.errorMsg }}
        </n-descriptions-item>
        <n-descriptions-item label="标题">
          {{ detail.title || '—' }}
        </n-descriptions-item>
        <n-descriptions-item label="正文">
          <div class="notice-record__content">{{ detail.content || '—' }}</div>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>
  </page-container>
</template>

<style scoped>
.notice-record__content {
  white-space: pre-wrap;
  line-height: 1.7;
}
</style>
