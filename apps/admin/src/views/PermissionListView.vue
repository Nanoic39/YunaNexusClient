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
import { buildPermissionTree, countPermissions, permissionApi } from '@yuna/core'
import type { PermissionSavePayload, PermissionTreeNode, PermissionView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<PermissionTreeNode[]>([])
const loading = ref(false)
const keyword = ref('')
const expandedKeys = ref<Array<string | number>>([])

/* ------------------------------ 列表 ------------------------------ */

/** 命中节点（分组按前缀，叶子按标识/资源/描述） */
function hit(node: PermissionTreeNode): boolean {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return true
  const perm = node.permission
  if (perm) {
    return (
      perm.permCode.toLowerCase().includes(text) ||
      (perm.resource ?? '').toLowerCase().includes(text) ||
      (perm.description ?? '').toLowerCase().includes(text)
    )
  }
  return node.code.toLowerCase().includes(text)
}

/** 关键词过滤：命中分组时保留整棵子树，命中叶子时保留自身与祖先链 */
function filterTree(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  if (!keyword.value.trim()) return nodes
  return nodes.flatMap((node) => {
    if (hit(node)) return [node]
    const children = filterTree(node.children)
    return children.length ? [{ ...node, children }] : []
  })
}

const filteredRows = computed(() => filterTree(rows.value))

function flattenKeys(nodes: PermissionTreeNode[]): Array<string | number> {
  return nodes.flatMap((node) => [node.key, ...flattenKeys(node.children)])
}

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: PermissionTreeNode) {
  const perm = row.permission
  const actions = perm
    ? [actionButton('编辑', () => openEdit(perm), 'primary'), actionButton('删除', () => confirmRemove(perm))]
    : [actionButton('新增子权限', () => openCreate(row.code), 'primary')]
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, actions)
}

const columns: DataTableColumns<PermissionTreeNode> = [
  {
    title: '权限标识',
    key: 'label',
    minWidth: 280,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.permission ? row.permission.permCode : row.label),
        h(
          'span',
          { class: 'yuna-cell__sub' },
          row.permission ? (row.permission.description ?? '—') : `${countPermissions(row)} 项权限`,
        ),
      ]),
  },
  {
    title: '资源',
    key: 'resource',
    minWidth: 240,
    ellipsis: { tooltip: true },
    render: (row) => row.permission?.resource ?? '—',
  },
  {
    title: '动作',
    key: 'action',
    width: 110,
    render: (row) => row.permission?.action ?? '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) =>
      row.permission ? h(StatusTag, { meta: enabledStatusMeta(row.permission.status) }) : '—',
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 172,
    render: (row) => (row.permission ? formatDateTime(row.permission.createTime) : '—'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 190,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = buildPermissionTree(await permissionApi.list())
    expandedKeys.value = flattenKeys(rows.value)
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

/** 新建权限点：可传入分组前缀，自动补全为 `前缀:` 便于分层维护 */
function openCreate(prefix = ''): void {
  editingId.value = null
  editForm.permCode = prefix ? `${prefix}:` : ''
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
  <page-container title="权限点" description="按权限标识分层维护权限点，供角色绑定授权">
    <template #extra>
      <n-button type="primary" @click="openCreate()">新建权限点</n-button>
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
      :row-key="(row: PermissionTreeNode) => row.key"
      :scroll-x="1180"
      :show-pagination="false"
      :expanded-row-keys="expandedKeys"
      @update:expanded-row-keys="(keys: Array<string | number>) => (expandedKeys = keys)"
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
            placeholder="如 auth:user:list（按 : 分段，创建后不可修改）"
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
