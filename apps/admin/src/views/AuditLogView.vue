<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDatePicker,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { PageContainer, DataTable, formatDateTime } from '@yuna/ui'
import { auditApi, type AuditChainReport, type AuditQueryFilter } from '@yuna/core'
import type { AuditLogView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const error = ref('')
const rows = ref<AuditLogView[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)

const username = ref('')
const module = ref('')
const action = ref('')
const keyword = ref('')
const status = ref<number | null>(null)
const service = ref('')
const range = ref<[number, number] | null>(null)

const chain = ref<AuditChainReport | null>(null)
const anchorBreaks = ref<string[] | null>(null)

const statusOptions = [
  { label: '成功', value: 1 },
  { label: '失败', value: 0 },
]

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / size.value)))

/** 组装检索条件：空值一律不传，避免后端生成 val = '' 的死条件 */
function buildFilter(): AuditQueryFilter {
  const filter: AuditQueryFilter = {}
  if (username.value.trim()) filter.username = username.value.trim()
  if (module.value.trim()) filter.module = module.value.trim()
  if (action.value.trim()) filter.action = action.value.trim()
  if (service.value.trim()) filter.service = service.value.trim()
  if (keyword.value.trim()) filter.keyword = keyword.value.trim()
  if (status.value !== null) filter.status = status.value
  if (range.value) {
    filter.startTime = range.value[0]
    filter.endTime = range.value[1]
  }
  return filter
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await auditApi.search(buildFilter(), page.value, size.value)
    rows.value = result.records
    total.value = result.total
  } catch (e) {
    error.value = handleApiError(e, router)
  } finally {
    loading.value = false
  }
}

function reset(): void {
  username.value = ''
  module.value = ''
  action.value = ''
  keyword.value = ''
  service.value = ''
  status.value = null
  range.value = null
  page.value = 1
  void load()
}

function turn(delta: number): void {
  const next = page.value + delta
  if (next < 1 || next > pageCount.value) return
  page.value = next
  void load()
}

async function exportCsv(): Promise<void> {
  try {
    const blob = await auditApi.exportCsv(buildFilter())
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    message.success('导出已开始（服务端上限 10000 行）')
  } catch (e) {
    message.error(handleApiError(e, router))
  }
}

async function verifyChain(): Promise<void> {
  chain.value = null
  try {
    chain.value = await auditApi.verifyChain({ limit: 2000 })
    if (chain.value.intact) {
      message.success(`证据链完整，已校验 ${chain.value.verified} 条`)
    } else {
      message.error('证据链断裂，详见下方明细')
    }
  } catch (e) {
    message.error(handleApiError(e, router))
  }
}

async function verifyAnchors(): Promise<void> {
  anchorBreaks.value = null
  try {
    anchorBreaks.value = await auditApi.verifyAnchors()
    if (anchorBreaks.value.length === 0) {
      message.success('锚定与现状一致')
    } else {
      message.error('锚定比对发现不一致')
    }
  } catch (e) {
    message.error(handleApiError(e, router))
  }
}

const columns = [
  { title: '时间', key: 'createTime', width: 170, render: (r: AuditLogView) => formatDateTime(r.createTime) },
  { title: '操作人', key: 'username', width: 130, render: (r: AuditLogView) => r.username || `#${r.userId ?? 0}` },
  { title: '服务', key: 'service', width: 150 },
  { title: '模块', key: 'module', width: 110, render: (r: AuditLogView) => r.module || '-' },
  {
    title: '动作',
    key: 'action',
    width: 150,
    render: (r: AuditLogView) =>
      h(NTag, { size: 'small', type: r.action === 'HTTP' ? 'default' : 'info' }, () => r.action),
  },
  { title: 'URI', key: 'uri', ellipsis: { tooltip: true } },
  {
    title: '结果',
    key: 'status',
    width: 80,
    render: (r: AuditLogView) =>
      h(NTag, { size: 'small', type: r.status === 1 ? 'success' : 'error' }, () =>
        r.status === 1 ? '成功' : '失败'),
  },
  { title: '耗时', key: 'durationMs', width: 90, render: (r: AuditLogView) => (r.durationMs == null ? '-' : `${r.durationMs} ms`) },
  { title: 'IP', key: 'ip', width: 130 },
]

onMounted(load)
</script>

<template>
  <page-container
    title="审计日志"
    description="按操作人、模块、动作、结果与关键字检索；支持导出、证据链校验与外部锚定比对"
  >
    <template #extra>
      <n-space>
        <n-button :loading="loading" @click="load">查询</n-button>
        <n-button quaternary @click="reset">重置</n-button>
        <n-button @click="exportCsv">导出 CSV</n-button>
        <n-button @click="verifyChain">校验证据链</n-button>
        <n-button @click="verifyAnchors">比对锚定</n-button>
      </n-space>
    </template>

    <n-alert v-if="error" type="error" style="margin-bottom: 12px">{{ error }}</n-alert>

    <n-alert
      v-if="chain"
      :type="chain.intact ? 'success' : 'error'"
      style="margin-bottom: 12px"
      :title="chain.intact ? `证据链完整（${chain.verified} 条）` : '证据链断裂'"
    >
      <template v-if="!chain.intact">
        <div v-for="item in chain.breaks" :key="item">{{ item }}</div>
      </template>
    </n-alert>

    <n-alert
      v-if="anchorBreaks && anchorBreaks.length"
      type="error"
      style="margin-bottom: 12px"
      title="锚定比对不一致"
    >
      <div v-for="item in anchorBreaks" :key="item">{{ item }}</div>
    </n-alert>

    <n-space style="margin-bottom: 12px">
      <n-input v-model:value="username" placeholder="操作人" clearable style="width: 140px" />
      <n-input v-model:value="module" placeholder="模块" clearable style="width: 120px" />
      <n-input v-model:value="action" placeholder="动作" clearable style="width: 140px" />
      <n-input v-model:value="service" placeholder="服务" clearable style="width: 150px" />
      <n-input v-model:value="keyword" placeholder="关键字（URI/参数/错误）" clearable style="width: 220px" />
      <n-select
        v-model:value="status"
        :options="statusOptions"
        style="width: 130px"
        placeholder="结果"
        clearable
      />
      <n-date-picker v-model:value="range" type="datetimerange" clearable style="width: 340px" />
    </n-space>

    <data-table
      :data="rows"
      :columns="columns"
      :loading="loading"
      :row-key="(r: AuditLogView) => r.id"
      :show-pagination="false"
    />

    <n-space justify="end" style="margin-top: 12px" align="center">
      <span>共 {{ total }} 条 · 第 {{ page }} / {{ pageCount }} 页</span>
      <n-button size="small" :disabled="page <= 1" @click="turn(-1)">上一页</n-button>
      <n-button size="small" :disabled="page >= pageCount" @click="turn(1)">下一页</n-button>
    </n-space>
  </page-container>
</template>
