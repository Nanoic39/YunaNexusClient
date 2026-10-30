<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDropdown,
  NEmpty,
  NPagination,
  NSkeleton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { FilterBar, PageContainer, formatDateTime, noticeChannelText } from '@yuna/ui'
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
const loadError = ref('')
const busyId = ref<number | null>(null)

const channelOptions = [
  { label: '站内信', value: 1 },
  { label: '邮件', value: 2 },
  { label: '短信', value: 3 },
]

function templateActions(row: NoticeTemplateView) {
  return [
    { label: row.status === 1 ? '停用模板' : '启用模板', key: 'toggle' },
    { label: '删除模板', key: 'remove' },
  ]
}

function onTemplateAction(key: string | number, row: NoticeTemplateView): void {
  if (key === 'toggle') void runToggle(row, row.status === 1 ? 0 : 1)
  if (key === 'remove') confirmRemove(row)
}

let loadSequence = 0
async function load(): Promise<void> {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await noticeAdminApi.listTemplates({
      page: page.value,
      size: size.value,
      keyword: keyword.value.trim() || undefined,
    })
    if (sequence !== loadSequence) return
    const lastPage = Math.max(1, Math.ceil(result.total / size.value))
    if (page.value > lastPage) {
      page.value = lastPage
      await load()
      return
    }
    rows.value = result.records
    total.value = result.total
  } catch (error) {
    if (sequence === loadSequence) loadError.value = handleApiError(error, router)
  } finally {
    if (sequence === loadSequence) loading.value = false
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
  channel: [
    { required: true, type: 'number', message: '请选择通知通道', trigger: ['change', 'blur'] },
  ],
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
  if (busyId.value !== null) return
  busyId.value = row.id
  try {
    await noticeAdminApi.toggleTemplateStatus(row.id, status)
    message.success(status === 1 ? '模板已启用' : '模板已停用')
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    busyId.value = null
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
  <page-container
    title="通知模板"
    description="按用途查找模板，预览内容后编辑。标题与正文支持 ${占位符}。"
  >
    <template #extra>
      <n-button type="primary" @click="openCreate">新建模板</n-button>
    </template>

    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="keyword"
        placeholder="搜索全部模板：名称 / 编码"
        clearable
        class="template-search"
        aria-label="模板名称或编码"
        @keyup.enter="search"
      />
    </filter-bar>

    <n-alert v-if="loadError" type="error" title="模板加载失败"
      >{{ loadError }}
      <div class="error-actions"><n-button size="small" @click="load">重试</n-button></div></n-alert
    >
    <div v-else :aria-busy="loading">
      <p class="library-summary">
        共 {{ total }} 个模板<span v-if="keyword.trim()"> · 搜索名称与编码</span>
      </p>
      <div v-if="loading" class="template-grid">
        <n-skeleton v-for="item in 4" :key="item" height="220px" />
      </div>
      <n-empty
        v-else-if="!rows.length"
        class="empty-state"
        :description="keyword.trim() ? '没有匹配的模板，请更换关键词' : '还没有通知模板'"
      >
        <template #extra
          ><n-button v-if="!keyword.trim()" @click="openCreate">新建第一个模板</n-button
          ><n-button v-else @click="reset">清空搜索</n-button></template
        >
      </n-empty>
      <div v-else class="template-grid">
        <article v-for="row in rows" :key="row.id" class="template-card">
          <div class="template-heading">
            <div>
              <h2>{{ row.templateName }}</h2>
              <code>{{ row.templateCode }}</code>
            </div>
            <span class="template-status">{{ row.status === 1 ? '已启用' : '已停用' }}</span>
          </div>
          <div class="template-preview">
            <span class="channel-label">{{
              row.channelLabel || noticeChannelText(row.channel)
            }}</span>
            <h3>{{ row.title || '无标题' }}</h3>
            <p>{{ row.content || '无正文' }}</p>
          </div>
          <footer class="template-footer">
            <span>更新于 {{ formatDateTime(row.updateTime) }}</span>
            <div>
              <n-button size="small" :disabled="busyId === row.id" @click="openEdit(row)"
                >编辑模板</n-button
              ><n-dropdown
                trigger="click"
                :options="templateActions(row)"
                @select="onTemplateAction($event, row)"
                ><n-button
                  size="small"
                  quaternary
                  :loading="busyId === row.id"
                  :aria-label="`${row.templateName}的更多操作`"
                  >更多</n-button
                ></n-dropdown
              >
            </div>
          </footer>
        </article>
      </div>
      <div v-if="total" class="pagination">
        <n-pagination
          :page="page"
          :page-size="size"
          :item-count="total"
          :page-sizes="[10, 20, 50]"
          :page-slot="5"
          show-size-picker
          :disabled="loading"
          @update:page="onPageChange"
          @update:page-size="onSizeChange"
        />
      </div>
    </div>

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
.error-actions {
  margin-top: 12px;
}
.template-search {
  width: 300px;
  max-width: 100%;
}
.library-summary {
  margin: 0 0 12px;
  color: var(--yuna-gray-600);
  font-size: 13px;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 16px;
}
.template-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 20px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
}
.template-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.template-heading > div {
  min-width: 0;
}
.template-heading h2 {
  margin: 0 0 4px;
  color: var(--yuna-gray-900);
  font-size: 15px;
  overflow-wrap: anywhere;
}
.template-heading code {
  color: var(--yuna-gray-600);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.template-status {
  font-size: 12px;
  color: var(--yuna-gray-600);
  flex-shrink: 0;
}
.template-preview {
  flex: 1;
  margin: 18px 0;
  padding: 14px;
  border-radius: var(--yuna-radius-md);
  background: var(--yuna-gray-50);
  overflow-wrap: anywhere;
}
.channel-label {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.template-preview h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--yuna-gray-900);
  margin: 6px 0;
}
.template-preview p {
  margin: 0;
  line-height: 1.7;
  color: var(--yuna-gray-700);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.template-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
.template-footer > span {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.template-footer > div {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.empty-state {
  padding: 60px 16px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
}
.pagination {
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
  padding: 20px 0 0;
}
@media (max-width: 600px) {
  .template-card {
    padding: 16px;
  }
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
