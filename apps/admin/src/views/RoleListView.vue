<script setup lang="ts">
import { h, computed, onMounted, reactive, ref } from 'vue'
import type { VNodeChild } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NScrollbar,
  NSelect,
  NSpin,
  NSwitch,
  NTabPane,
  NTabs,
  NTree,
  useDialog,
  useMessage,
} from 'naive-ui'
import type {
  DataTableColumns,
  FormInst,
  FormRules,
  TreeOption,
} from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  dataScopeText,
  enabledStatusMeta,
  formatDateTime,
} from '@yuna/ui'
import {
  buildPermissionTree,
  collectPermissionIds,
  countPermissions,
  deptApi,
  expandPermissionKeys,
  menuApi,
  permissionApi,
  pickPermissionIds,
  roleApi,
} from '@yuna/core'
import type {
  DataScope,
  DeptTreeNode,
  MenuTreeNode,
  PermissionView,
  PermissionTreeNode,
  RoleSavePayload,
  RoleView,
} from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<RoleView[]>([])
const loading = ref(false)
const keyword = ref('')

const dataScopeOptions = [1, 2, 3, 4, 5].map((value) => ({
  label: dataScopeText(value as DataScope),
  value,
}))

/* ------------------------------ 列表 ------------------------------ */

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return rows.value
  return rows.value.filter(
    (row) =>
      row.roleCode.toLowerCase().includes(text) ||
      row.roleName.toLowerCase().includes(text),
  )
})

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: RoleView) {
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('编辑', () => openEdit(row), 'primary'),
    actionButton('绑定', () => openBind(row)),
    actionButton('删除', () => confirmRemove(row)),
  ])
}

const columns: DataTableColumns<RoleView> = [
  {
    title: '角色',
    key: 'roleName',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.roleName),
        h('span', { class: 'yuna-cell__sub' }, row.roleCode),
      ]),
  },
  {
    title: '描述',
    key: 'description',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: (row) => row.description ?? '—',
  },
  {
    title: '数据范围',
    key: 'dataScope',
    width: 140,
    render: (row) => dataScopeText(row.dataScope),
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
    width: 220,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await roleApi.list()
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
  roleCode: string
  roleName: string
  description: string
  dataScope: DataScope
  status: number
}>({
  roleCode: '',
  roleName: '',
  description: '',
  dataScope: 4,
  status: 1,
})

const editRules: FormRules = {
  roleCode: [
    { required: true, message: '请输入角色标识', trigger: ['input', 'blur'] },
    {
      pattern: /^[a-zA-Z0-9_.-]+$/,
      message: '仅支持字母、数字、下划线、中划线与点',
      trigger: ['input', 'blur'],
    },
  ],
  roleName: [{ required: true, message: '请输入角色名称', trigger: ['input', 'blur'] }],
}

const editTitle = computed(() => (editingId.value === null ? '新建角色' : '编辑角色'))

function resetEditForm(): void {
  editForm.roleCode = ''
  editForm.roleName = ''
  editForm.description = ''
  editForm.dataScope = 4
  editForm.status = 1
}

function openCreate(): void {
  editingId.value = null
  resetEditForm()
  editVisible.value = true
}

function openEdit(row: RoleView): void {
  editingId.value = row.id
  editForm.roleCode = row.roleCode
  editForm.roleName = row.roleName
  editForm.description = row.description ?? ''
  editForm.dataScope = row.dataScope
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
  const payload: RoleSavePayload = {
    roleCode: editForm.roleCode.trim(),
    roleName: editForm.roleName.trim(),
    description: editForm.description.trim() || undefined,
    dataScope: editForm.dataScope,
    status: editForm.status,
  }
  editSaving.value = true
  try {
    if (editingId.value === null) {
      await roleApi.create(payload)
      message.success('角色已创建')
    } else {
      await roleApi.update(editingId.value, payload)
      message.success('角色已更新')
    }
    editVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    editSaving.value = false
  }
}

function confirmRemove(row: RoleView): void {
  dialog.warning({
    title: '删除角色',
    content: `确认删除角色「${row.roleName}」？该角色的权限、菜单与数据范围绑定将一并移除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await roleApi.remove(row.id)
        message.success('角色已删除')
        await load()
      } catch (error) {
        message.error(handleApiError(error, router))
      }
    },
  })
}

/* ------------------------------ 绑定（权限点 / 菜单 / 数据范围） ------------------------------ */

const bindVisible = ref(false)
const bindRole = ref<RoleView | null>(null)
const bindLoading = ref(false)
const savingPerm = ref(false)
const savingMenu = ref(false)
const savingDept = ref(false)

const permissionTree = ref<PermissionTreeNode[]>([])
const menuTree = ref<MenuTreeNode[]>([])
const deptTree = ref<DeptTreeNode[]>([])
const checkedPermKeys = ref<Array<string | number>>([])
const checkedMenuKeys = ref<Array<string | number>>([])
const checkedDeptKeys = ref<Array<string | number>>([])

const menuOptions = computed<TreeOption[]>(() => toTreeOptions(menuTree.value, (node) => node.menuName))
const deptOptions = computed<TreeOption[]>(() => toTreeOptions(deptTree.value, (node) => node.deptName))

/* 权限点：按 permCode 前缀分层，勾选分组将级联其下权限点 */
interface PermOption extends TreeOption {
  permission: PermissionView | null
  count: number
}

const permissionOptions = computed<PermOption[]>(() => toPermOptions(permissionTree.value))
const selectedPermCount = computed(() => pickPermissionIds(checkedPermKeys.value).length)
const totalPermCount = computed(() => collectPermissionIds(permissionTree.value).length)

function toPermOptions(nodes: PermissionTreeNode[]): PermOption[] {
  return nodes.map((node) => ({
    key: node.key,
    label: node.permission ? node.permission.permCode : node.label,
    permission: node.permission,
    count: countPermissions(node),
    children: node.children.length ? toPermOptions(node.children) : undefined,
  }))
}

function renderPermLabel({ option }: { option: TreeOption }): VNodeChild {
  const node = option as PermOption
  return h('div', { class: 'perm-item' }, [
    h('span', { class: 'perm-item__code' }, String(node.label)),
    h(
      'span',
      { class: 'perm-item__desc' },
      node.permission ? (node.permission.description ?? '—') : `${node.count} 项权限`,
    ),
  ])
}

interface TreeNodeLike {
  id: number
}

function toTreeOptions<T extends TreeNodeLike & { children: T[] }>(
  nodes: T[],
  labelOf: (node: T) => string,
): TreeOption[] {
  return nodes.map((node) => ({
    key: node.id,
    label: labelOf(node),
    children: node.children.length ? toTreeOptions(node.children, labelOf) : undefined,
  }))
}

const bindTitle = computed(() => (bindRole.value ? `绑定 · ${bindRole.value.roleName}` : '绑定'))

async function openBind(row: RoleView): Promise<void> {
  bindRole.value = row
  bindVisible.value = true
  bindLoading.value = true
  try {
    const [permList, menus, depts, permIds, menuIds, deptIds] = await Promise.all([
      permissionApi.list(),
      menuApi.tree(),
      deptApi.tree(),
      roleApi.listPermissions(row.id),
      roleApi.listMenus(row.id),
      roleApi.listDepts(row.id),
    ])
    permissionTree.value = buildPermissionTree(permList)
    menuTree.value = menus
    deptTree.value = depts
    checkedPermKeys.value = expandPermissionKeys(permissionTree.value, permIds)
    checkedMenuKeys.value = [...menuIds]
    checkedDeptKeys.value = [...deptIds]
  } catch (error) {
    message.error(handleApiError(error, router))
    bindVisible.value = false
  } finally {
    bindLoading.value = false
  }
}

async function savePermissions(): Promise<void> {
  if (!bindRole.value) return
  savingPerm.value = true
  try {
    await roleApi.setPermissions(bindRole.value.id, pickPermissionIds(checkedPermKeys.value))
    message.success('权限点绑定已保存')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingPerm.value = false
  }
}

async function saveMenus(): Promise<void> {
  if (!bindRole.value) return
  savingMenu.value = true
  try {
    await roleApi.setMenus(bindRole.value.id, checkedMenuKeys.value.map(Number))
    message.success('菜单绑定已保存')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingMenu.value = false
  }
}

async function saveDepts(): Promise<void> {
  if (!bindRole.value) return
  savingDept.value = true
  try {
    await roleApi.setDepts(bindRole.value.id, checkedDeptKeys.value.map(Number))
    message.success('数据范围绑定已保存')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingDept.value = false
  }
}

onMounted(load)
</script>

<template>
  <page-container title="角色管理" description="维护角色定义，并配置其权限点、可见菜单与数据范围">
    <template #extra>
      <n-button type="primary" @click="openCreate">新建角色</n-button>
    </template>

    <filter-bar :show-default-actions="false">
      <n-input
        v-model:value="keyword"
        placeholder="角色名称 / 标识"
        clearable
        style="width: 240px"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="filteredRows"
      :loading="loading"
      :row-key="(row: RoleView) => row.id"
      :scroll-x="1100"
      :show-pagination="false"
    />

    <!-- 新建 / 编辑 -->
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
        <n-form-item label="角色标识" path="roleCode">
          <n-input
            v-model:value="editForm.roleCode"
            :disabled="editingId !== null"
            placeholder="如 operator（创建后不可修改）"
          />
        </n-form-item>
        <n-form-item label="角色名称" path="roleName">
          <n-input v-model:value="editForm.roleName" placeholder="如 运营管理员" />
        </n-form-item>
        <n-form-item label="数据范围">
          <n-select v-model:value="editForm.dataScope" :options="dataScopeOptions" />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="editForm.status" :checked-value="1" :unchecked-value="0">
            <template #checked>启用</template>
            <template #unchecked>停用</template>
          </n-switch>
        </n-form-item>
        <n-form-item label="描述">
          <n-input
            v-model:value="editForm.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="选填"
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

    <!-- 绑定 -->
    <n-modal
      v-model:show="bindVisible"
      preset="card"
      :title="bindTitle"
      style="width: 680px; max-width: calc(100vw - 32px)"
    >
      <n-tabs type="line" animated>
        <n-tab-pane name="permissions" tab="权限点">
          <n-spin :show="bindLoading">
            <div class="bind-hint">
              已选 {{ selectedPermCount }} / {{ totalPermCount }} 项，勾选分组将级联其下权限点
            </div>
            <n-scrollbar style="max-height: 380px">
              <n-tree
                block-line
                cascade
                checkable
                selectable
                :data="permissionOptions"
                :render-label="renderPermLabel"
                :checked-keys="checkedPermKeys"
                :default-expand-all="true"
                @update:checked-keys="(keys: Array<string | number>) => (checkedPermKeys = keys)"
              />
            </n-scrollbar>
          </n-spin>
          <div class="modal-footer">
            <n-button type="primary" :loading="savingPerm" @click="savePermissions">保存权限点</n-button>
          </div>
        </n-tab-pane>

        <n-tab-pane name="menus" tab="菜单">
          <n-spin :show="bindLoading">
            <div class="bind-hint">勾选该角色可见的菜单，父级勾选将级联子级</div>
            <n-scrollbar style="max-height: 380px">
              <n-tree
                block-line
                cascade
                checkable
                selectable
                :data="menuOptions"
                :checked-keys="checkedMenuKeys"
                :default-expand-all="true"
                @update:checked-keys="(keys: Array<string | number>) => (checkedMenuKeys = keys)"
              />
            </n-scrollbar>
          </n-spin>
          <div class="modal-footer">
            <n-button type="primary" :loading="savingMenu" @click="saveMenus">保存菜单</n-button>
          </div>
        </n-tab-pane>

        <n-tab-pane name="depts" tab="数据范围">
          <n-spin :show="bindLoading">
            <div class="bind-hint">
              <template v-if="bindRole?.dataScope === 5">自定义数据范围：勾选该角色可见的部门</template>
              <template v-else>当前数据范围为「{{ dataScopeText(bindRole?.dataScope) }}」，此处的部门绑定仅在数据范围设为「自定义」时生效</template>
            </div>
            <n-scrollbar style="max-height: 380px">
              <n-tree
                block-line
                cascade
                checkable
                selectable
                :data="deptOptions"
                :checked-keys="checkedDeptKeys"
                :default-expand-all="true"
                @update:checked-keys="(keys: Array<string | number>) => (checkedDeptKeys = keys)"
              />
            </n-scrollbar>
          </n-spin>
          <div class="modal-footer">
            <n-button type="primary" :loading="savingDept" @click="saveDepts">保存数据范围</n-button>
          </div>
        </n-tab-pane>
      </n-tabs>
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

.bind-hint {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--yuna-gray-600);
}

.perm-item {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.perm-item__code {
  font-size: 13px;
  color: var(--yuna-gray-800);
}

.perm-item__desc {
  font-size: 12px;
  color: var(--yuna-gray-500);
}
</style>
