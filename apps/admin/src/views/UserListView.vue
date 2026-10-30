<script setup lang="ts">
import { treeNodeProps, defaultTreeMenuItems } from '@yuna/ui'
import type { TreeMenuNode } from '@yuna/ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { VNodeChild } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDropdown,
  NInput,
  NModal,
  NScrollbar,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTree,
  NTooltip,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns, TreeOption } from 'naive-ui'
import {
  DataTable,
  FilterBar,
  PageContainer,
  StatusTag,
  formatDateTime,
  formatRelative,
  truncateMiddle,
  userStatusMeta,
} from '@yuna/ui'
import {
  authAdminApi,
  session,
  buildPermissionTree,
  countPermissions,
  permissionApi,
  roleApi,
  userRoleApi,
} from '@yuna/core'
import type { AdminUserView, PermissionTreeNode, PermissionView, RoleView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

type UserAction = 'enable' | 'disable' | 'unlock' | 'kick'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const actionApi: Record<UserAction, (userId: number) => Promise<void>> = {
  enable: authAdminApi.enableUser,
  disable: authAdminApi.disableUser,
  unlock: authAdminApi.unlockUser,
  kick: authAdminApi.kickUser,
}

const actionLabel: Record<UserAction, string> = {
  enable: '启用',
  disable: '禁用',
  unlock: '解锁',
  kick: '踢下线',
}

const filters = reactive<{
  keyword: string
  status: number | null
  roleId: number | null
  permissionId: number | null
}>({
  roleId: null,
  permissionId: null,
  keyword: '',
  status: null,
})

const rows = ref<AdminUserView[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const size = ref(20)

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
]

/** `lockedUntil` 有值即视为处于锁定/待解锁状态 */
const hasLock = (row: AdminUserView): boolean => row.lockedUntil !== null

function renderStatus(row: AdminUserView) {
  const tags = [h(StatusTag, { meta: userStatusMeta(row.status) })]
  if (hasLock(row)) {
    tags.push(
      h(
        NTooltip,
        { trigger: 'hover' },
        {
          trigger: () => h(StatusTag, { tone: 'warning', text: '已锁定' }),
          default: () => row.lockReason ?? '账号已被锁定',
        },
      ),
    )
  }
  return h('div', { class: 'yuna-cell-actions' }, tags)
}

function renderActions(row: AdminUserView) {
  const options: Array<{ label: string; key: UserAction; disabled?: boolean }> = [
    {
      label: row.status === 1 ? '禁用账号' : '启用账号',
      key: row.status === 1 ? 'disable' : 'enable',
      disabled: row.externalId === session.state.externalId,
    },
  ]
  if (hasLock(row)) options.push({ label: '解锁账号', key: 'unlock' })
  options.push({ label: '踢下线', key: 'kick' })
  return h('div', { class: 'yuna-cell-actions' }, [
    h(
      NButton,
      { size: 'small', secondary: true, onClick: () => void openSettings(row) },
      { default: () => '账号设置' },
    ),
    h(
      NDropdown,
      {
        trigger: 'click',
        options,
        onSelect: (key: string | number) => confirmAction(row, key as UserAction),
      },
      {
        default: () =>
          h(
            NButton,
            { size: 'small', quaternary: true, 'aria-label': `${row.username}的更多操作` },
            { default: () => '更多' },
          ),
      },
    ),
  ])
}

const columns: DataTableColumns<AdminUserView> = [
  {
    title: '用户',
    key: 'username',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.username),
        h('span', { class: 'yuna-cell__sub' }, truncateMiddle(row.externalId)),
      ]),
  },
  {
    title: '邮箱',
    key: 'email',
    minWidth: 180,
    ellipsis: { tooltip: true },
    render: (row) => row.email ?? '—',
  },
  {
    title: '手机',
    key: 'mobile',
    width: 150,
    render: (row) =>
      row.mobile ? `${row.mobileCountry ? `+${row.mobileCountry} ` : ''}${row.mobile}` : '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 150,
    render: renderStatus,
  },
  {
    title: '最近登录',
    key: 'lastLoginTime',
    width: 180,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, formatRelative(row.lastLoginTime)),
        h('span', { class: 'yuna-cell__sub' }, row.lastLoginIp ?? '—'),
      ]),
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
    width: 176,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await authAdminApi.listUsers({
      page: page.value,
      size: size.value,
      keyword: filters.keyword.trim() || undefined,
      status: filters.status ?? undefined,
      roleId: filters.roleId ?? undefined,
      permissionId: filters.permissionId ?? undefined,
    })
    rows.value = result.records
    total.value = result.total
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

async function runAction(user: AdminUserView, action: UserAction): Promise<void> {
  const label = actionLabel[action]
  try {
    await actionApi[action](user.userId)
    message.success(`${label}成功`)
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  }
}

function confirmAction(user: AdminUserView, action: UserAction): void {
  const label = actionLabel[action]
  dialog.warning({
    title: `${label}账号`,
    content: `确认对「${user.username}」执行${label}操作？`,
    positiveText: label,
    negativeText: '取消',
    onPositiveClick: () => runAction(user, action),
  })
}

/* ------------------------------ 用户设置（角色 / 权限 / 密码） ------------------------------ */

const settingsVisible = ref(false)
const settingsUser = ref<AdminUserView | null>(null)
const settingsTab = ref('roles')
const settingsLoading = ref(false)

const allRoles = ref<RoleView[]>([])
const allPermissions = ref<PermissionView[]>([])
/** 角色 → 权限 id 缓存，避免重复请求 */
const rolePermCache = new Map<number, number[]>()

const selectedRoleIds = ref<number[]>([])
const savingRoles = ref(false)

const permissionTree = ref<PermissionTreeNode[]>([])
const grantedPermIds = ref<number[]>([])

const settingsTitle = computed(() =>
  settingsUser.value ? `用户设置 · ${settingsUser.value.username}` : '用户设置',
)

const roleOptions = computed(() =>
  allRoles.value.map((role) => ({
    label: `${role.roleName}（${role.roleCode}）`,
    value: role.id,
  })),
)

const grantedSet = computed(() => new Set(grantedPermIds.value))

interface PermOption extends TreeOption {
  permission: PermissionView | null
  count: number
}

function toPermOptions(nodes: PermissionTreeNode[]): PermOption[] {
  return nodes.map((node) => ({
    key: node.key,
    label: node.permission ? node.permission.permCode : node.label,
    permission: node.permission,
    count: countPermissions(node),
    children: node.children.length ? toPermOptions(node.children) : undefined,
  }))
}

/** 用户设置里的权限树是只读派生视图，右键只提供"看清/复制/刷新" */
function buildUserTreeMenu(node: TreeMenuNode): ReturnType<typeof defaultTreeMenuItems> {
  return defaultTreeMenuItems(node, {
    keyLabel: '权限标识',
    onRefresh: () => void load(),
  })
}

const permissionOptions = computed<PermOption[]>(() => toPermOptions(permissionTree.value))

function renderPermLabel({ option }: { option: TreeOption }): VNodeChild {
  const node = option as PermOption
  const granted = node.permission ? grantedSet.value.has(node.permission.id) : false
  return h('div', { class: 'perm-item' }, [
    h('div', { class: 'perm-item__head' }, [
      h(
        'span',
        { class: 'perm-item__code' },
        node.permission ? node.permission.permCode : String(node.label),
      ),
      granted ? h(StatusTag, { tone: 'success', text: '已授权' }) : null,
    ]),
    h(
      'span',
      { class: 'perm-item__desc' },
      node.permission ? (node.permission.description ?? '—') : `${node.count} 项权限`,
    ),
  ])
}

async function fetchRolePerms(roleId: number): Promise<number[]> {
  if (!rolePermCache.has(roleId)) rolePermCache.set(roleId, await roleApi.listPermissions(roleId))
  return rolePermCache.get(roleId) ?? []
}

/** 依据当前所选角色汇总派生权限（用户权限由角色派生，无用户-权限直绑接口） */
async function refreshGranted(): Promise<void> {
  const lists = await Promise.all(selectedRoleIds.value.map(fetchRolePerms))
  grantedPermIds.value = [...new Set(lists.flat())]
}

async function onRolesChange(ids: number[]): Promise<void> {
  selectedRoleIds.value = ids
  try {
    await refreshGranted()
  } catch (error) {
    message.error(handleApiError(error, router))
  }
}

async function openSettings(row: AdminUserView): Promise<void> {
  settingsUser.value = row
  settingsTab.value = 'roles'
  settingsVisible.value = true
  settingsLoading.value = true

  rolePermCache.clear()
  try {
    const [roles, perms, bound] = await Promise.all([
      allRoles.value.length ? Promise.resolve(allRoles.value) : roleApi.list(),
      allPermissions.value.length ? Promise.resolve(allPermissions.value) : permissionApi.list(),
      userRoleApi.list(row.userId),
    ])
    allRoles.value = roles
    allPermissions.value = perms
    permissionTree.value = buildPermissionTree(perms)
    selectedRoleIds.value = [...bound]
    await refreshGranted()
  } catch (error) {
    message.error(handleApiError(error, router))
    settingsVisible.value = false
  } finally {
    settingsLoading.value = false
  }
}

async function saveRoles(): Promise<void> {
  if (!settingsUser.value) return
  savingRoles.value = true
  try {
    await userRoleApi.set(settingsUser.value.userId, selectedRoleIds.value)
    message.success('用户角色已更新')
    await refreshGranted()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingRoles.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function openResetRecords() {
  settingsVisible.value = false
  void router.push('/password-resets')
}

function reset(): void {
  filters.roleId = null
  filters.permissionId = null
  filters.keyword = ''
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

const filterRoles = ref<{ label: string; value: number }[]>([])
const filterPermissions = ref<{ label: string; value: number }[]>([])
onMounted(() => {
  void load()
  void Promise.all([roleApi.list(), permissionApi.list()])
    .then(([roles, permissions]) => {
      filterRoles.value = roles
        .filter((r) => r.status === 1)
        .map((r) => ({ label: r.roleName, value: r.id }))
      filterPermissions.value = permissions
        .filter((p) => p.status === 1)
        .map((p) => ({ label: p.permCode, value: p.id }))
    })
    .catch((error) => message.error(handleApiError(error, router)))
})
</script>

<template>
  <page-container
    title="用户管理"
    description="查询账号状态、执行启用 / 禁用 / 解锁 / 会话撤销，并配置角色与权限、查看账号和密码重置记录"
  >
    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="filters.keyword"
        placeholder="用户名 / 邮箱 / 手机号"
        aria-label="搜索用户名、邮箱或手机号"
        clearable
        style="width: 240px; max-width: 100%"
        @keyup.enter="search"
      />
      <n-select
        v-model:value="filters.status"
        :options="statusOptions"
        placeholder="全部状态"
        aria-label="账号状态"
        clearable
        style="width: 150px; max-width: 100%"
      />
      <n-select
        v-model:value="filters.roleId"
        :options="filterRoles"
        placeholder="全部角色"
        aria-label="按角色筛选"
        filterable
        clearable
        style="width: 180px; max-width: 100%"
      />
      <n-select
        v-model:value="filters.permissionId"
        :options="filterPermissions"
        placeholder="全部有效权限"
        aria-label="按权限筛选"
        filterable
        clearable
        style="width: 220px; max-width: 100%"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :total="total"
      :page="page"
      :size="size"
      :row-key="(row: AdminUserView) => row.userId"
      :scroll-x="1280"
      @update:page="onPageChange"
      @update:size="onSizeChange"
    />

    <n-modal
      v-model:show="settingsVisible"
      preset="card"
      :title="settingsTitle"
      style="width: 720px; max-width: calc(100vw - 32px)"
    >
      <n-spin :show="settingsLoading">
        <n-tabs v-model:value="settingsTab" type="line" animated>
          <n-tab-pane name="roles"
            ><template #tab>角色</template>
            <div class="settings-hint">
              为用户分配角色；用户权限由所选角色派生，如需调整权限请变更角色。
            </div>
            <n-select
              multiple
              filterable
              :options="roleOptions"
              :value="selectedRoleIds"
              placeholder="选择角色"
              @update:value="onRolesChange"
            />
            <div class="modal-footer">
              <n-button type="primary" :loading="savingRoles" @click="saveRoles">保存角色</n-button>
            </div>
          </n-tab-pane>

          <n-tab-pane name="permissions"
            ><template #tab>权限</template>
            <div class="settings-hint">
              已授权 {{ grantedPermIds.length }} 项（由角色派生，只读）
            </div>
            <n-scrollbar style="max-height: 380px">
              <n-tree
                block-line
                :selectable="false"
                :checkable="false"
                :data="permissionOptions"
                :render-label="renderPermLabel"
                :default-expand-all="true"
                :node-props="treeNodeProps(buildUserTreeMenu)"
              />
            </n-scrollbar>
          </n-tab-pane>

          <n-tab-pane name="account" tab="账号信息"
            ><p>账号：{{ settingsUser?.username }}</p>
            <p>邮箱：{{ settingsUser?.email || '未绑定' }}</p>
            <p>外部标识：{{ settingsUser?.externalId }}</p>
            <p>注册时间：{{ formatDateTime(settingsUser?.createTime ?? null) }}</p>
            <n-alert type="info"
              >密码由用户在登录页通过邮箱验证码自行重置。管理员无法设置或查看用户密码。</n-alert
            ><n-button style="margin-top: 16px" @click="openResetRecords"
              >查看密码重置记录</n-button
            ></n-tab-pane
          >
        </n-tabs>
      </n-spin>
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

.settings-hint {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--yuna-gray-600);
}

.perm-item {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.perm-item__head {
  display: flex;
  align-items: center;
  gap: 8px;
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
