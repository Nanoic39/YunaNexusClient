<script setup lang="ts">
import { treeNodeProps, defaultTreeMenuItems } from '@yuna/ui'
import type { TreeMenuNode } from '@yuna/ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NTree,
  NSpin,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSwitch,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules, TreeOption } from 'naive-ui'
import { FilterBar, PageContainer, StatusTag, enabledStatusMeta } from '@yuna/ui'
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
/** 权限树右键：通用项 + 展开/折叠此节点（本页持有 expandedKeys，可控） */
function buildTreeNodeMenu(node: TreeMenuNode): ReturnType<typeof defaultTreeMenuItems> {
  const key = String(node.key ?? '')
  return defaultTreeMenuItems(node, {
    keyLabel: '权限标识',
    extra: [
      {
        key: 'expand-node',
        label: '展开此节点',
        icon: 'expand',
        onSelect: () => {
          if (key && !expandedKeys.value.includes(key)) expandedKeys.value = [...expandedKeys.value, key]
        },
      },
      {
        key: 'collapse-node',
        label: '折叠此节点',
        icon: 'collapse',
        onSelect: () => {
          expandedKeys.value = expandedKeys.value.filter((item) => item !== key)
        },
      },
    ],
    onRefresh: () => void load(),
  })
}

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
function toOptions(nodes: PermissionTreeNode[]): TreeOption[] {
  return nodes.map((n) => ({
    key: n.key,
    label: n.permission ? `${n.permission.permCode} · ${n.permission.description || ''}` : n.label,
    children: n.children.length ? toOptions(n.children) : undefined,
  }))
}
const treeOptions = computed(() => toOptions(filteredRows.value))

function flattenKeys(nodes: PermissionTreeNode[]): Array<string | number> {
  return nodes.flatMap((node) => [node.key, ...flattenKeys(node.children)])
}

const selectedKey = ref('')
function allNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((n) => [n, ...allNodes(n.children)])
}
const selectedNode = computed(() =>
  allNodes(rows.value).find((n) => String(n.key) === selectedKey.value),
)
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

    <n-spin :show="loading"
      ><div class="access-workspace">
        <section class="access-tree">
          <n-tree
            block-line
            :data="treeOptions"
            v-model:expanded-keys="expandedKeys"
            :selected-keys="selectedKey ? [selectedKey] : []"
            @update:selected-keys="(keys) => (selectedKey = String(keys[0] ?? ''))"
            :node-props="treeNodeProps(buildTreeNodeMenu)"
          />
        </section>
        <section class="access-detail" v-if="selectedNode">
          <h2>{{ selectedNode.permission?.permCode || selectedNode.label }}</h2>
          <template v-if="selectedNode.permission"
            ><p>{{ selectedNode.permission.description || '暂无描述' }}</p>
            <p>
              资源：<code>{{ selectedNode.permission.resource }}</code>
            </p>
            <p>动作：{{ selectedNode.permission.action }}</p>
            <status-tag :meta="enabledStatusMeta(selectedNode.permission.status)" />
            <div class="access-actions">
              <n-button type="primary" @click="openEdit(selectedNode.permission)">编辑权限</n-button
              ><n-button type="error" @click="confirmRemove(selectedNode.permission)"
                >删除权限</n-button
              >
            </div></template
          >
          <template v-else
            ><p>包含 {{ countPermissions(selectedNode) }} 项权限</p>
            <n-button type="primary" @click="openCreate(selectedNode.code)"
              >新增子权限</n-button
            ></template
          >
        </section>
        <section class="access-detail" v-else>
          <p>选择左侧权限节点，查看资源、动作与授权说明。</p>
        </section>
      </div></n-spin
    >

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

<style scoped>
.access-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.4fr);
  gap: 24px;
  min-height: 420px;
}
.access-tree,
.access-detail {
  padding: 20px;
  background: var(--yuna-surface);
  border: var(--yuna-card-border);
  border-radius: 12px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.access-tree {
  max-height: 70vh;
  overflow: auto;
}
.access-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
@media (max-width: 800px) {
  .access-workspace {
    grid-template-columns: 1fr;
  }
  .access-tree {
    max-height: 40vh;
  }
}
</style>
