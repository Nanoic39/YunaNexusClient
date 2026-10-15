<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NSelect, useDialog, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  appealStatusMeta,
  formatDateTime,
  formatRelative,
} from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import type { AppealView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

type AuditAction = 'approve' | 'reject'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const filters = reactive<{ status: number | null }>({ status: null })

const rows = ref<AppealView[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)

const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
]

/** 待处理申诉才可审核 */
const canAudit = (row: AppealView): boolean => row.status === 0

function renderAudit(row: AppealView) {
  if (!canAudit(row)) {
    return h('div', { class: 'yuna-cell' }, [
      h('span', null, row.auditor ?? '—'),
      h('span', { class: 'yuna-cell__sub' }, row.auditRemark ?? '—'),
    ])
  }
  return h(StatusTag, { tone: 'default', text: '待审核' })
}

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: AppealView) {
  if (!canAudit(row)) return h('span', { class: 'yuna-cell__sub' }, formatDateTime(row.auditTime))
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('通过', () => confirmAudit(row, 'approve'), 'primary'),
    actionButton('驳回', () => confirmAudit(row, 'reject')),
  ])
}

const columns: DataTableColumns<AppealView> = [
  {
    title: '申诉人',
    key: 'username',
    minWidth: 160,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.username ?? '—'),
        h('span', { class: 'yuna-cell__sub' }, row.userId ? `用户 ID：${row.userId}` : '无关联账号'),
      ]),
  },
  {
    title: '申诉说明',
    key: 'appealReason',
    minWidth: 260,
    ellipsis: { tooltip: true },
    render: (row) => row.appealReason ?? '—',
  },
  {
    title: '联系方式',
    key: 'contact',
    width: 180,
    ellipsis: { tooltip: true },
    render: (row) => row.contact ?? '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: appealStatusMeta(row.status) }),
  },
  {
    title: '审核信息',
    key: 'audit',
    minWidth: 200,
    render: renderAudit,
  },
  {
    title: '提交时间',
    key: 'createTime',
    width: 160,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, formatRelative(row.createTime)),
        h('span', { class: 'yuna-cell__sub' }, formatDateTime(row.createTime)),
      ]),
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await authAdminApi.listAppeals({
      page: page.value,
      size: size.value,
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

async function runAudit(row: AppealView, action: AuditAction, remark: string): Promise<void> {
  try {
    const payload = remark ? { remark } : {}
    if (action === 'approve') await authAdminApi.approveAppeal(row.id, payload)
    else await authAdminApi.rejectAppeal(row.id, payload)
    message.success(action === 'approve' ? '申诉已通过，账号已解锁' : '申诉已驳回')
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  }
}

/** 审核确认弹窗：可选填写审核备注（≤500，与后端一致） */
function confirmAudit(row: AppealView, action: AuditAction): void {
  const remark = ref('')
  const approve = action === 'approve'
  const content = () =>
    h('div', { class: 'appeal-audit' }, [
      h(
        'p',
        null,
        approve
          ? `确认通过「${row.username ?? '该用户'}」的解锁申诉？通过后将自动解锁账号。`
          : `确认驳回「${row.username ?? '该用户'}」的解锁申诉？`,
      ),
      h(NInput, {
        value: remark.value,
        type: 'textarea',
        placeholder: '审核备注（选填）',
        maxlength: 500,
        autosize: { minRows: 3, maxRows: 6 },
        'onUpdate:value': (value: string) => {
          remark.value = value
        },
      }),
    ])

  dialog[approve ? 'success' : 'warning']({
    title: approve ? '通过申诉' : '驳回申诉',
    content,
    positiveText: approve ? '通过并解锁' : '驳回',
    negativeText: '取消',
    onPositiveClick: () => runAudit(row, action, remark.value.trim()),
  })
}

function search(): void {
  page.value = 1
  void load()
}

function reset(): void {
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
  <page-container title="申诉审核" description="复核账号解锁申诉，通过后自动解锁对应账号">
    <filter-bar :loading="loading" @search="search" @reset="reset">
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
      :row-key="(row: AppealView) => row.id"
      :scroll-x="1250"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />
  </page-container>
</template>
