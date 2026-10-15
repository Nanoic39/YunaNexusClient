<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  enabledStatusMeta,
  formatDateTime,
  noticeChannelText,
} from '@yuna/ui'
import { noticeAdminApi } from '@yuna/core'
import type { NoticeChannel, NoticeTemplateSavePayload, NoticeTemplateView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<NoticeTemplateView[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)
const keyword = ref('')

const channelOptions = [
  { label: '站内信', value: 1 },
  { label: '邮件', value: 2 },
  { label: '短信', value: 3 },
]

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: NoticeTemplateView) {
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('编辑', () => openEdit(row), 'primary'),
    actionButton(row.status === 1 ? '停用' : '启用', () =>
      runToggle(row, row.status === 1 ? 0 : 1),
    ),
    actionButton('删除', () => confirmRemove(row)),
  ])
}

const columns: DataTableColumns<NoticeTemplateView> = [
  {
    title: '模板',
    key: 'templateName',
    minWidth: 220,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.templateName),
        h('span', { class: 'yuna-cell__sub' }, row.templateCode),
      ]),
  },
  {
    title: '通道',
    key: 'channel',
    width: 110,
    render: (row) => row.channelLabel || noticeChannelText(row.channel),
  },
  {
    title: '标题模板',
    key: 'title',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: (row) => row.title || '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: enabledStatusMeta(row.status) }),
  },
  {
    title: '更新时间',
    key: 'updateTime',
    width: 172,
    render: (row) => formatDateTime(row.updateTime),
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
    const result = await noticeAdminApi.listTemplates({
      page: page.value,
      size: size.value,
      keyword: keyword.value.trim() || undefined,
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
  keyword.value = ''
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

/* ------------------------------ 新建 / 编辑 ------------------------------ */

const editVisible = ref(false)
const editSaving = ref(false)
const editingId = ref<number | null>(null)
const editFormRef = ref<FormInst | null>(null)

const editForm = reactive<{
  templateCode: string
  templateName: string
  channel: NoticeChannel
  title: string
  content: string
  remark: string
}>({
  templateCode: '',
  templateName: '',
  channel: 1,
  title: '',
  content: '',
  remark: '',
})

const editRules: FormRules = {
  templateCode: [
    { required: true, message: '请输入模板编码', trigger: ['input', 'blur'] },
    {
      pattern: /^[A-Z0-9_]+$/,
      message: '仅支持大写字母、数字与下划线，如 E2E_MEETING_REMIND',
      trigger: ['input', 'blur'],
    },
  ],
  templateName: [{ required: true, message: '请输入模板名称', trigger: ['input', 'blur'] }],
  channel: [{ required: true, type: 'number', message: '请选择通知通道', trigger: ['change', 'blur'] }],
  title: [{ required: true, message: '请输入标题模板', trigger: ['input', 'blur'] }],
  content: [{ required: true, message: '请输入正文模板', trigger: ['input', 'blur'] }],
}

const editTitle = computed(() => (editingId.value === null ? '新建模板' : '编辑模板'))

function resetEditForm(): void {
  editForm.templateCode = ''
  editForm.templateName = ''
  editForm.channel = 1
  editForm.title = ''
  editForm.content = ''
  editForm.remark = ''
}

function openCreate(): void {
  editingId.value = null
  resetEditForm()
  editVisible.value = true
}

function openEdit(row: NoticeTemplateView): void {
  editingId.value = row.id
  editForm.templateCode = row.templateCode
  editForm.templateName = row.templateName
  editForm.channel = row.channel
  editForm.title = row.title
  editForm.content = row.content
  editForm.remark = row.remark ?? ''
  editVisible.value = true
}

async function submitEdit(): Promise<void> {
  if (editFormRef.value) {
    try {
      await editFormRef.value.validate()
    } catch {
      return
    }
  }
  const payload: NoticeTemplateSavePayload = {
    templateCode: editForm.templateCode.trim(),
    templateName: editForm.templateName.trim(),
    channel: editForm.channel,
    title: editForm.title,
    content: editForm.content,
    remark: editForm.remark.trim() || undefined,
  }
  editSaving.value = true
  try {
    if (editingId.value === null) {
      await noticeAdminApi.createTemplate(payload)
      message.success('模板已创建')
    } else {
      await noticeAdminApi.updateTemplate(editingId.value, payload)
      message.success('模板已更新')
    }
    editVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    editSaving.value = false
  }
}

async function runToggle(row: NoticeTemplateView, status: number): Promise<void> {
  try {
    await noticeAdminApi.toggleTemplateStatus(row.id, status)
    message.success(status === 1 ? '模板已启用' : '模板已停用')
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  }
}

function confirmRemove(row: NoticeTemplateView): void {
  dialog.warning({
    title: '删除模板',
    content: `确认删除模板「${row.templateName}」？已发送的历史记录不受影响，但后续将无法再按此模板发送。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await noticeAdminApi.removeTemplate(row.id)
        message.success('模板已删除')
        await load()
      } catch (error) {
        message.error(handleApiError(error, router))
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <page-container title="通知模板" description="维护通知模板，标题与正文支持 ${占位符} 动态渲染">
    <template #extra>
      <n-button type="primary" @click="openCreate">新建模板</n-button>
    </template>

    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="keyword"
        placeholder="模板名称 / 编码"
        clearable
        style="width: 240px"
        @keyup.enter="search"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :size="size"
      :row-key="(row: NoticeTemplateView) => row.id"
      :scroll-x="1100"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />

    <n-modal
      v-model:show="editVisible"
      preset="card"
      :title="editTitle"
      style="width: 600px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
    >
      <n-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="top"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="模板编码" path="templateCode">
          <n-input
            v-model:value="editForm.templateCode"
            :disabled="editingId !== null"
            placeholder="如 E2E_MEETING_REMIND（创建后不可修改）"
          />
        </n-form-item>
        <n-form-item label="模板名称" path="templateName">
          <n-input v-model:value="editForm.templateName" placeholder="如 会议提醒" />
        </n-form-item>
        <n-form-item label="通知通道" path="channel">
          <n-select v-model:value="editForm.channel" :options="channelOptions" />
        </n-form-item>
        <n-form-item label="标题模板" path="title">
          <n-input v-model:value="editForm.title" placeholder="如 ${meeting}提醒" />
        </n-form-item>
        <n-form-item label="正文模板" path="content">
          <n-input
            v-model:value="editForm.content"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 10 }"
            placeholder="如 你好 ${name}，${meeting}将于 ${time} 开始，请准时参加。"
          />
        </n-form-item>
        <n-form-item label="备注">
          <n-input
            v-model:value="editForm.remark"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="选填，用于说明该模板的用途"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="editVisible = false">取消</n-button>
          <n-button type="primary" :loading="editSaving" @click="submitEdit">保存</n-button>
        </div>
      </template>
    </n-modal>
  </page-container>
</template>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
