<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  NTreeSelect,
  useDialog,
  useMessage,
} from 'naive-ui'
import type {
  DataTableColumns,
  FormInst,
  FormRules,
  SelectOption,
  TreeSelectOption,
} from 'naive-ui'
import {
  DataTable,
  PageContainer,
  StatusTag,
  enabledStatusMeta,
} from '@yuna/ui'
import { deptApi } from '@yuna/core'
import type { DeptSavePayload, DeptTreeNode } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<DeptTreeNode[]>([])
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<number | null>(null)

const statusOptions: SelectOption[] = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

/* ------------------------------ 列表 ------------------------------ */

function filterTree(nodes: DeptTreeNode[]): DeptTreeNode[] {
  const text = keyword.value.trim().toLowerCase()
  const match = (node: DeptTreeNode): boolean => {
    const hitKeyword =
      !text ||
      node.deptName.toLowerCase().includes(text) ||
      node.deptCode.toLowerCase().includes(text)
    const hitStatus = statusFilter.value === null || node.status === statusFilter.value
    return hitKeyword && hitStatus
  }
  const walk = (list: DeptTreeNode[]): DeptTreeNode[] =>
    list
      .map((node) => ({ ...node, children: walk(node.children) }))
      .filter((node) => match(node) || node.children.length > 0)
  return walk(nodes)
}

const filteredRows = computed(() => filterTree(rows.value))
const expandedKeys = ref<Array<string | number>>([])

function flattenKeys(nodes: DeptTreeNode[]): number[] {
  return nodes.flatMap((node) => [node.id, ...flattenKeys(node.children)])
}

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: DeptTreeNode) {
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('新增子级', () => openCreate(row.id), 'primary'),
    actionButton('编辑', () => openEdit(row)),
    actionButton('删除', () => confirmRemove(row)),
  ])
}

const columns: DataTableColumns<DeptTreeNode> = [
  {
    title: '部门名称',
    key: 'deptName',
    minWidth: 240,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.deptName),
        h('span', { class: 'yuna-cell__sub' }, row.deptCode),
      ]),
  },
  {
    title: '排序',
    key: 'sort',
    width: 90,
    render: (row) => String(row.sort),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: enabledStatusMeta(row.status) }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await deptApi.tree()
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
  deptCode: string
  deptName: string
  parentId: number
  sort: number
  status: number
}>({
  deptCode: '',
  deptName: '',
  parentId: 0,
  sort: 0,
  status: 1,
})

const editRules: FormRules = {
  deptCode: [
    { required: true, message: '请输入部门编码', trigger: ['input', 'blur'] },
    {
      pattern: /^[a-zA-Z0-9_.-]+$/,
      message: '仅支持字母、数字、下划线、中划线与点',
      trigger: ['input', 'blur'],
    },
  ],
  deptName: [{ required: true, message: '请输入部门名称', trigger: ['input', 'blur'] }],
}

const editTitle = computed(() => (editingId.value === null ? '新建部门' : '编辑部门'))

const parentOptions = computed<TreeSelectOption[]>(() => [
  { key: 0, label: '顶级部门', children: toTreeSelect(rows.value) },
])

function toTreeSelect(nodes: DeptTreeNode[]): TreeSelectOption[] {
  return nodes.map((node) => ({
    key: node.id,
    label: node.deptName,
    children: node.children.length ? toTreeSelect(node.children) : undefined,
  }))
}

function openCreate(parentId = 0): void {
  editingId.value = null
  editForm.deptCode = ''
  editForm.deptName = ''
  editForm.parentId = parentId
  editForm.sort = 0
  editForm.status = 1
  editVisible.value = true
}

function openEdit(row: DeptTreeNode): void {
  editingId.value = row.id
  editForm.deptCode = row.deptCode
  editForm.deptName = row.deptName
  editForm.parentId = row.parentId
  editForm.sort = row.sort
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
  const payload: DeptSavePayload = {
    deptCode: editForm.deptCode.trim(),
    deptName: editForm.deptName.trim(),
    parentId: editForm.parentId,
    sort: editForm.sort,
    status: editForm.status,
  }
  editSaving.value = true
  try {
    if (editingId.value === null) {
      await deptApi.create(payload)
      message.success('部门已创建')
    } else {
      await deptApi.update(editingId.value, payload)
      message.success('部门已更新')
    }
    editVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    editSaving.value = false
  }
}

function confirmRemove(row: DeptTreeNode): void {
  dialog.warning({
    title: '删除部门',
    content: `确认删除部门「${row.deptName}」？存在子部门时将无法删除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deptApi.remove(row.id)
        message.success('部门已删除')
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
  <page-container title="部门管理" description="维护组织架构树，作为角色数据范围的归属依据">
    <template #extra>
      <n-button type="primary" @click="openCreate(0)">新建部门</n-button>
    </template>

    <div class="dept-filters">
      <n-input
        v-model:value="keyword"
        placeholder="部门名称 / 编码"
        clearable
        style="width: 240px"
      />
      <n-select
        v-model:value="statusFilter"
        :options="statusOptions"
        placeholder="全部状态"
        clearable
        style="width: 150px"
      />
    </div>

    <data-table
      :columns="columns"
      :data="filteredRows"
      :loading="loading"
      :row-key="(row: DeptTreeNode) => row.id"
      :scroll-x="760"
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
        <n-form-item label="部门编码" path="deptCode">
          <n-input
            v-model:value="editForm.deptCode"
            :disabled="editingId !== null"
            placeholder="如 hq.tech（创建后不可修改）"
          />
        </n-form-item>
        <n-form-item label="部门名称" path="deptName">
          <n-input v-model:value="editForm.deptName" placeholder="如 技术中心" />
        </n-form-item>
        <n-form-item label="上级部门">
          <n-tree-select
            v-model:value="editForm.parentId"
            :options="parentOptions"
            :disabled="editingId !== null"
            placeholder="顶级部门"
          />
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="editForm.sort" :min="0" style="width: 100%" />
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
.dept-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
