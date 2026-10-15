<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSwitch,
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
} from '@yuna/ui'
import { permissionApi } from '@yuna/core'
import type { PermissionSavePayload, PermissionView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<PermissionView[]>([])
const loading = ref(false)
const keyword = ref('')

/* ------------------------------ 列表 ------------------------------ */

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return rows.value
  return rows.value.filter(
    (row) =>
      row.permCode.toLowerCase().includes(text) ||
      (row.resource ?? '').toLowerCase().includes(text) ||
      (row.description ?? '').toLowerCase().includes(text),
  )
})

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: PermissionView) {
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('编辑', () => openEdit(row), 'primary'),
    actionButton('删除', () => confirmRemove(row)),
  ])
}

const columns: DataTableColumns<PermissionView> = [
  {
    title: '权限标识',
    key: 'permCode',
    minWidth: 220,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.permCode),
        h('span', { class: 'yuna-cell__sub' }, row.description ?? '—'),
      ]),
  },
  {
    title: '资源',
    key: 'resource',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: (row) => row.resource ?? '—',
  },
  {
    title: '动作',
    key: 'action',
    width: 110,
    render: (row) => row.action ?? '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: enabledStatusMeta(row.status) }),
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
    width: 160,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await permissionApi.list()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

/* ------------------------------ 新建 / 编辑 ------------------------------ */

const editVisible = ref(false)
const editSaving = ref(false)
const editingId = ref<number | null>(null)
const editFormRef = ref<FormInst | null>(null)

const editForm = reactive<{
  permCode: string
  resource: string
  action: string
  description: string
  status: number
}>({
  permCode: '',
  resource: '',
  action: '',
  description: '',
  status: 1,
})

const editRules: FormRules = {
  permCode: [{ required: true, message: '请输入权限标识', trigger: ['input', 'blur'] }],
  resource: [{ required: true, message: '请输入资源标识', trigger: ['input', 'blur'] }],
  action: [{ required: true, message: '请输入动作', trigger: ['input', 'blur'] }],
}

const editTitle = computed(() => (editingId.value === null ? '新建权限点' : '编辑权限点'))

function openCreate(): void {
  editingId.value = null
  editForm.permCode = ''
  editForm.resource = ''
  editForm.action = ''
  editForm.description = ''
  editForm.status = 1
  editVisible.value = true
}

function openEdit(row: PermissionView): void {
  editingId.value = row.id
  editForm.permCode = row.permCode
  editForm.resource = row.resource ?? ''
  editForm.action = row.action ?? ''
  editForm.description = row.description ?? ''
  editForm.status = row.status
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
  const payload: PermissionSavePayload = {
    permCode: editForm.permCode.trim(),
    resource: editForm.resource.trim(),
    action: editForm.action.trim(),
    description: editForm.description.trim() || undefined,
    status: editForm.status,
  }
  editSaving.value = true
  try {
    if (editingId.value === null) {
      await permissionApi.create(payload)
      message.success('权限点已创建')
    } else {
      await permissionApi.update(editingId.value, payload)
      message.success('权限点已更新')
    }
    editVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    editSaving.value = false
  }
}

function confirmRemove(row: PermissionView): void {
  dialog.warning({
    title: '删除权限点',
    content: `确认删除权限点「${row.permCode}」？该权限与角色的绑定关系将一并移除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await permissionApi.remove(row.id)
        message.success('权限点已删除')
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
  <page-container title="权限点" description="维护细粒度权限标识，供角色绑定授权">
    <template #extra>
      <n-button type="primary" @click="openCreate">新建权限点</n-button>
    </template>

    <filter-bar :show-default-actions="false">
      <n-input
        v-model:value="keyword"
        placeholder="权限标识 / 资源 / 描述"
        clearable
        style="width: 260px"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="filteredRows"
      :loading="loading"
      :row-key="(row: PermissionView) => row.id"
      :scroll-x="1150"
      :show-pagination="false"
    />

    <n-modal
      v-model:show="editVisible"
      preset="card"
      :title="editTitle"
      style="width: 520px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
    >
      <n-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="top"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="权限标识" path="permCode">
          <n-input
            v-model:value="editForm.permCode"
            :disabled="editingId !== null"
            placeholder="如 auth:user:list（创建后不可修改）"
          />
        </n-form-item>
        <n-form-item label="资源" path="resource">
          <n-input v-model:value="editForm.resource" placeholder="如 /api/v1/auth/admin/users" />
        </n-form-item>
        <n-form-item label="动作" path="action">
          <n-input v-model:value="editForm.action" placeholder="如 read / write / *" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input
            v-model:value="editForm.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="选填"
          />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="editForm.status" :checked-value="1" :unchecked-value="0">
            <template #checked>启用</template>
            <template #unchecked>停用</template>
          </n-switch>
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
}
</style>
