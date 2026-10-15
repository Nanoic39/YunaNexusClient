<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpin,
  NSwitch,
  NTag,
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
import { authAdminApi, badgeAdminApi } from '@yuna/core'
import type {
  BadgeDefinitionView,
  BadgeGrantRecord,
  BadgeGrantType,
  BadgeSavePayload,
} from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const rows = ref<BadgeDefinitionView[]>([])
const loading = ref(false)
const keyword = ref('')

const grantTypeOptions = [
  { label: '手动发放', value: 'manual' },
  { label: '条件发放', value: 'condition' },
]

function grantTypeText(type: BadgeGrantType): string {
  return type === 'condition' ? '条件发放' : '手动发放'
}

/* ------------------------------ 列表 ------------------------------ */

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return rows.value
  return rows.value.filter(
    (row) =>
      row.badgeCode.toLowerCase().includes(text) ||
      row.badgeName.toLowerCase().includes(text),
  )
})

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: BadgeDefinitionView) {
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, [
    actionButton('编辑', () => openEdit(row), 'primary'),
    actionButton('发放', () => void openGrant(row), 'primary'),
    actionButton('删除', () => confirmRemove(row)),
  ])
}

const columns: DataTableColumns<BadgeDefinitionView> = [
  {
    title: '徽章',
    key: 'badgeName',
    minWidth: 200,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.badgeName),
        h('span', { class: 'yuna-cell__sub' }, row.badgeCode),
      ]),
  },
  {
    title: '等级',
    key: 'badgeLevel',
    width: 90,
    render: (row) => h(NTag, { size: 'small', bordered: false }, { default: () => `Lv.${row.badgeLevel}` }),
  },
  {
    title: '发放方式',
    key: 'grantType',
    width: 110,
    render: (row) => grantTypeText(row.grantType),
  },
  {
    title: '发放条件',
    key: 'condition',
    minWidth: 200,
    ellipsis: { tooltip: true },
    render: (row) => row.condition ?? '—',
  },
  {
    title: '已发放',
    key: 'grantedCount',
    width: 90,
    render: (row) => `${row.grantedCount} 人次`,
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
    width: 220,
    fixed: 'right',
    render: renderActions,
  },
]

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await badgeAdminApi.list()
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
  badgeCode: string
  badgeName: string
  badgeLevel: number
  grantType: BadgeGrantType
  condition: string
  description: string
  status: number
}>({
  badgeCode: '',
  badgeName: '',
  badgeLevel: 1,
  grantType: 'manual',
  condition: '',
  description: '',
  status: 1,
})

const editRules: FormRules = {
  badgeCode: [
    { required: true, message: '请输入徽章编码', trigger: ['input', 'blur'] },
    {
      pattern: /^[A-Za-z0-9_]+$/,
      message: '仅支持字母、数字与下划线',
      trigger: ['input', 'blur'],
    },
  ],
  badgeName: [{ required: true, message: '请输入徽章名称', trigger: ['input', 'blur'] }],
}

const editTitle = computed(() => (editingId.value === null ? '新建徽章' : '编辑徽章'))

function resetEditForm(): void {
  editForm.badgeCode = ''
  editForm.badgeName = ''
  editForm.badgeLevel = 1
  editForm.grantType = 'manual'
  editForm.condition = ''
  editForm.description = ''
  editForm.status = 1
}

function openCreate(): void {
  editingId.value = null
  resetEditForm()
  editVisible.value = true
}

function openEdit(row: BadgeDefinitionView): void {
  editingId.value = row.id
  editForm.badgeCode = row.badgeCode
  editForm.badgeName = row.badgeName
  editForm.badgeLevel = row.badgeLevel
  editForm.grantType = row.grantType
  editForm.condition = row.condition ?? ''
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
  if (editForm.grantType === 'condition' && !editForm.condition.trim()) {
    message.warning('条件发放需填写触发条件表达式')
    return
  }
  const payload: BadgeSavePayload = {
    badgeCode: editForm.badgeCode.trim(),
    badgeName: editForm.badgeName.trim(),
    badgeLevel: editForm.badgeLevel,
    description: editForm.description.trim() || undefined,
    grantType: editForm.grantType,
    condition: editForm.grantType === 'condition' ? editForm.condition.trim() : undefined,
    status: editForm.status,
  }
  editSaving.value = true
  try {
    if (editingId.value === null) {
      await badgeAdminApi.create(payload)
      message.success('徽章已创建')
    } else {
      await badgeAdminApi.update(editingId.value, payload)
      message.success('徽章已更新')
    }
    editVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    editSaving.value = false
  }
}

function confirmRemove(row: BadgeDefinitionView): void {
  dialog.warning({
    title: '删除徽章',
    content: `确认删除徽章「${row.badgeName}」？已发放记录将保留。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await badgeAdminApi.remove(row.id)
        message.success('徽章已删除')
        await load()
      } catch (error) {
        message.error(handleApiError(error, router))
      }
    },
  })
}

/* ------------------------------ 手动发放 ------------------------------ */

const grantVisible = ref(false)
const grantBadge = ref<BadgeDefinitionView | null>(null)
const grantLoading = ref(false)
const grantSaving = ref(false)
const grantUserIds = ref<number[]>([])
const userOptions = ref<{ label: string; value: number }[]>([])

const grantTitle = computed(() =>
  grantBadge.value ? `发放徽章 · ${grantBadge.value.badgeName}` : '发放徽章',
)

async function openGrant(row: BadgeDefinitionView): Promise<void> {
  grantBadge.value = row
  grantUserIds.value = []
  grantVisible.value = true
  grantLoading.value = true
  try {
    if (!userOptions.value.length) {
      const result = await authAdminApi.listUsers({ page: 1, size: 100 })
      userOptions.value = result.records.map((user) => ({
        label: user.email ? `${user.username}（${user.email}）` : user.username,
        value: user.userId,
      }))
    }
  } catch (error) {
    message.error(handleApiError(error, router))
    grantVisible.value = false
  } finally {
    grantLoading.value = false
  }
}

async function submitGrant(): Promise<void> {
  if (!grantBadge.value) return
  if (!grantUserIds.value.length) {
    message.warning('请选择至少一位用户')
    return
  }
  grantSaving.value = true
  try {
    await badgeAdminApi.grant(grantBadge.value.id, { userIds: grantUserIds.value })
    message.success('徽章已发放')
    grantVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    grantSaving.value = false
  }
}

/* ------------------------------ 发放记录 ------------------------------ */

const recordsVisible = ref(false)
const recordsLoading = ref(false)
const records = ref<BadgeGrantRecord[]>([])

const recordColumns: DataTableColumns<BadgeGrantRecord> = [
  {
    title: '徽章',
    key: 'badgeName',
    minWidth: 180,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.badgeName),
        h('span', { class: 'yuna-cell__sub' }, row.badgeCode),
      ]),
  },
  { title: '用户', key: 'username', minWidth: 140 },
  {
    title: '发放方式',
    key: 'grantType',
    width: 110,
    render: (row) => grantTypeText(row.grantType),
  },
  {
    title: '发放时间',
    key: 'grantedTime',
    width: 172,
    render: (row) => formatDateTime(row.grantedTime),
  },
]

async function openRecords(): Promise<void> {
  recordsVisible.value = true
  recordsLoading.value = true
  try {
    records.value = await badgeAdminApi.records()
  } catch (error) {
    message.error(handleApiError(error, router))
    recordsVisible.value = false
  } finally {
    recordsLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <page-container title="徽章管理" description="维护徽章定义，支持条件自动发放与手动发放给指定用户">
    <template #extra>
      <n-button secondary @click="openRecords">发放记录</n-button>
      <n-button type="primary" @click="openCreate">新建徽章</n-button>
    </template>

    <filter-bar :show-default-actions="false">
      <n-input
        v-model:value="keyword"
        placeholder="徽章名称 / 编码"
        clearable
        style="width: 240px"
      />
    </filter-bar>

    <data-table
      :columns="columns"
      :data="filteredRows"
      :loading="loading"
      :row-key="(row: BadgeDefinitionView) => row.id"
      :scroll-x="1180"
      :show-pagination="false"
    />

    <!-- 新建 / 编辑 -->
    <n-modal
      v-model:show="editVisible"
      preset="card"
      :title="editTitle"
      style="width: 560px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
    >
      <n-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-placement="top"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="徽章编码" path="badgeCode">
          <n-input
            v-model:value="editForm.badgeCode"
            :disabled="editingId !== null"
            placeholder="如 CONTRIBUTOR（创建后不可修改）"
          />
        </n-form-item>
        <n-form-item label="徽章名称" path="badgeName">
          <n-input v-model:value="editForm.badgeName" placeholder="如 内容贡献者" />
        </n-form-item>
        <n-form-item label="等级">
          <n-input-number v-model:value="editForm.badgeLevel" :min="1" :max="5" style="width: 160px" />
        </n-form-item>
        <n-form-item label="发放方式">
          <n-select v-model:value="editForm.grantType" :options="grantTypeOptions" />
        </n-form-item>
        <n-form-item v-if="editForm.grantType === 'condition'" label="触发条件">
          <n-input
            v-model:value="editForm.condition"
            placeholder="如 login.streak >= 7"
          />
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

    <!-- 手动发放 -->
    <n-modal
      v-model:show="grantVisible"
      preset="card"
      :title="grantTitle"
      style="width: 560px; max-width: calc(100vw - 32px)"
    >
      <n-spin :show="grantLoading">
        <n-alert
          v-if="grantBadge?.grantType === 'condition'"
          type="info"
          :bordered="false"
          style="margin-bottom: 12px"
        >
          该徽章为条件发放，通常由系统自动授予；此处的发放将作为手动补充。
        </n-alert>
        <n-form label-placement="top">
          <n-form-item label="选择用户">
            <n-select
              v-model:value="grantUserIds"
              multiple
              filterable
              :options="userOptions"
              placeholder="选择要发放的用户"
            />
          </n-form-item>
        </n-form>
      </n-spin>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="grantVisible = false">取消</n-button>
          <n-button type="primary" :loading="grantSaving" @click="submitGrant">发放</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 发放记录 -->
    <n-modal
      v-model:show="recordsVisible"
      preset="card"
      title="徽章发放记录"
      style="width: 720px; max-width: calc(100vw - 32px)"
    >
      <data-table
        :columns="recordColumns"
        :data="records"
        :loading="recordsLoading"
        :row-key="(row: BadgeGrantRecord) => row.id"
        :scroll-x="640"
        :show-pagination="false"
      />
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
