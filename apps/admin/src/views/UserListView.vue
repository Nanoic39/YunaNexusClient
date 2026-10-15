<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { VNodeChild } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
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

const filters = reactive<{ keyword: string; status: number | null }>({
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

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(
    NButton,
    { size: 'small', secondary: true, type, onClick },
    { default: () => label },
  )
}

function renderActions(row: AdminUserView) {
  const nodes = [
    row.status === 1
      ? actionButton('禁用', () => confirmAction(row, 'disable'))
      : actionButton('启用', () => confirmAction(row, 'enable'), 'primary'),
  ]
  if (hasLock(row)) nodes.push(actionButton('解锁', () => confirmAction(row, 'unlock'), 'primary'))
  nodes.push(actionButton('踢下线', () => confirmAction(row, 'kick')))
  nodes.push(actionButton('设置', () => void openSettings(row), 'primary'))
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, nodes)
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
    width: 280,
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

const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)

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

const permissionOptions = computed<PermOption[]>(() => toPermOptions(permissionTree.value))

function renderPermLabel({ option }: { option: TreeOption }): VNodeChild {
  const node = option as PermOption
  const granted = node.permission ? grantedSet.value.has(node.permission.id) : false
  return h('div', { class: 'perm-item' }, [
    h('div', { class: 'perm-item__head' }, [
      h('span', { class: 'perm-item__code' }, node.permission ? node.permission.permCode : String(node.label)),
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
  newPassword.value = ''
  confirmPassword.value = ''
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

async function savePassword(): Promise<void> {
  if (!settingsUser.value) return
  const password = newPassword.value
  if (password.length < 6) {
    message.warning('密码长度至少 6 位')
    return
  }
  if (password !== confirmPassword.value) {
    message.warning('两次输入的密码不一致')
    return
  }
  savingPassword.value = true
  try {
    await authAdminApi.resetPassword(settingsUser.value.userId, { password })
    message.success('密码已重置')
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingPassword.value = false
  }
}

function search(): void {
  page.value = 1
  void load()
}

function reset(): void {
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

onMounted(load)
</script>

<template>
  <page-container
    title="用户管理"
    description="查询账号状态、执行启用 / 禁用 / 解锁 / 会话撤销，并配置角色、权限与密码"
  >
    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-input
        v-model:value="filters.keyword"
        placeholder="用户名 / 邮箱 / 手机号"
        clearable
        style="width: 240px"
        @keyup.enter="search"
      />
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
      :row-key="(row: AdminUserView) => row.userId"
      :scroll-x="1380"
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
          <n-tab-pane name="roles" tab="角色">
            <div class="settings-hint">
              为用户分配角色；用户权限由所选角色派生，如需调整权限请变更角色。
            </div>
            <n-select
              multiple
              :options="roleOptions"
              :value="selectedRoleIds"
              placeholder="选择角色"
              @update:value="onRolesChange"
            />
            <div class="modal-footer">
              <n-button type="primary" :loading="savingRoles" @click="saveRoles">保存角色</n-button>
            </div>
          </n-tab-pane>

          <n-tab-pane name="permissions" tab="权限">
            <div class="settings-hint">已授权 {{ grantedPermIds.length }} 项（由角色派生，只读）</div>
            <n-scrollbar style="max-height: 380px">
              <n-tree
                block-line
                :selectable="false"
                :checkable="false"
                :data="permissionOptions"
                :render-label="renderPermLabel"
                :default-expand-all="true"
              />
            </n-scrollbar>
          </n-tab-pane>

          <n-tab-pane name="password" tab="重置密码">
            <n-alert type="info" :bordered="false" style="margin-bottom: 12px">
              重置后该用户需使用新密码登录，原有会话不受影响。
            </n-alert>
            <n-form label-placement="top">
              <n-form-item label="新密码">
                <n-input
                  v-model:value="newPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="至少 6 位"
                />
              </n-form-item>
              <n-form-item label="确认密码">
                <n-input
                  v-model:value="confirmPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="再次输入新密码"
                />
              </n-form-item>
            </n-form>
            <div class="modal-footer">
              <n-button type="primary" :loading="savingPassword" @click="savePassword">
                重置密码
              </n-button>
            </div>
          </n-tab-pane>
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
