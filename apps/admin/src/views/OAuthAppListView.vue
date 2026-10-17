<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NInput,
  NSelect,
  NModal,
  NRadio,
  NRadioGroup,
  NTabPane,
  NTabs,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { DataTable, PageContainer, StatusTag, formatDateTime, oauthAppStatusMeta } from '@yuna/ui'
import {
  session,
  OAUTH_SCOPE_LABELS,
  oauthAppAdminApi,
  oauthAppRegistrationEnabled,
} from '@yuna/core'
import type { ApplicationCategory, OAuthApplicationView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const classificationApp = ref<OAuthApplicationView | null>(null),
  classificationVisible = ref(false),
  classificationSaving = ref(false)
const category = ref<ApplicationCategory>('THIRD_PARTY')
const categoryOptions = [
  { label: '官方原生', value: 'OFFICIAL_NATIVE' },
  { label: '官方三方', value: 'OFFICIAL_THIRD_PARTY' },
  { label: '其他三方', value: 'THIRD_PARTY' },
]
const canClassify = computed(() => session.state.roles.some((r) => r.roleCode === 'super_admin'))
function openClassification(app: OAuthApplicationView) {
  classificationApp.value = app
  category.value = app.applicationCategory || 'THIRD_PARTY'
  classificationVisible.value = true
}
async function classify() {
  const app = classificationApp.value
  if (!app?.clientId || classificationSaving.value) return
  classificationSaving.value = true
  try {
    await oauthAppAdminApi.classify(app.clientId, category.value)
    message.success('应用分类已更新并记录审计')
    classificationVisible.value = false
    await load()
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    classificationSaving.value = false
  }
}

const rows = ref<OAuthApplicationView[]>([])
const loading = ref(false)
const activeTab = ref<'pending' | 'all'>('pending')

const pendingRows = computed(() => rows.value.filter((row) => row.status === 0))
const displayRows = computed(() => (activeTab.value === 'pending' ? pendingRows.value : rows.value))

function scopeText(app: OAuthApplicationView): string {
  return app.scopes.map((scope) => OAUTH_SCOPE_LABELS[scope] ?? scope).join('、')
}

/* ------------------------------ 列表 ------------------------------ */

function actionButton(
  label: string,
  onClick: () => void,
  type: 'default' | 'error' | 'primary' = 'default',
) {
  return h(NButton, { size: 'small', secondary: true, type, onClick }, { default: () => label })
}

function renderActions(row: OAuthApplicationView) {
  const buttons = [actionButton('详情', () => openDetail(row))]
  if (canClassify.value && (row.status === 1 || row.status === 3))
    buttons.push(actionButton('应用分类', () => openClassification(row)))
  if (row.status === 0) buttons.push(actionButton('审核', () => openReview(row), 'primary'))
  if (row.status === 1) buttons.push(actionButton('停用', () => confirmToggle(row, 3)))
  if (row.status === 3) buttons.push(actionButton('启用', () => confirmToggle(row, 1)))
  buttons.push(actionButton('删除', () => confirmRemove(row), 'error'))
  return h('div', { class: 'yuna-cell-actions', style: { gap: '6px' } }, buttons)
}

const columns: DataTableColumns<OAuthApplicationView> = [
  {
    title: '应用',
    key: 'appName',
    minWidth: 220,
    render: (row) =>
      h('div', { class: 'yuna-cell' }, [
        h('span', null, row.appName),
        h('span', { class: 'yuna-cell__sub' }, row.clientId ?? '未分配 Client ID'),
      ]),
  },
  {
    title: '申请人',
    key: 'ownerName',
    width: 130,
    render: (row) => row.ownerName || `#${row.ownerUserId}`,
  },
  {
    title: '权限范围',
    key: 'scopes',
    minWidth: 220,
    render: (row) =>
      h(
        'div',
        { class: 'yuna-cell-actions', style: { gap: '6px', flexWrap: 'wrap' } },
        row.scopes.map((scope) =>
          h(
            NTag,
            { size: 'small', bordered: false },
            { default: () => OAUTH_SCOPE_LABELS[scope] ?? scope },
          ),
        ),
      ),
  },
  {
    title: '回调地址',
    key: 'redirectUris',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render: (row) => row.redirectUris.join('、'),
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) => h(StatusTag, { meta: oauthAppStatusMeta(row.status) }),
  },
  {
    title: '提交时间',
    key: 'createTime',
    width: 172,
    render: (row) => formatDateTime(row.createTime),
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
  if (!oauthAppRegistrationEnabled) return
  loading.value = true
  try {
    rows.value = await oauthAppAdminApi.list()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

/* ------------------------------ 审核 ------------------------------ */

const reviewVisible = ref(false)
const reviewSaving = ref(false)
const reviewApp = ref<OAuthApplicationView | null>(null)
const reviewApproved = ref(true)
const reviewRemark = ref('')

function openReview(row: OAuthApplicationView): void {
  reviewApp.value = row
  reviewApproved.value = true
  reviewRemark.value = ''
  reviewVisible.value = true
}

async function submitReview(): Promise<void> {
  const app = reviewApp.value
  if (!app) return
  const remark = reviewRemark.value.trim()
  if (!reviewApproved.value && !remark) {
    message.warning('驳回时请填写驳回原因，便于申请人修改')
    return
  }
  reviewSaving.value = true
  try {
    await oauthAppAdminApi.audit(app.id, {
      approved: reviewApproved.value,
      auditRemark: remark || undefined,
    })
    message.success(reviewApproved.value ? '审核已通过，已分配客户端凭证' : '已驳回')
    reviewVisible.value = false
    await load()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    reviewSaving.value = false
  }
}

/* ------------------------------ 详情 ------------------------------ */

const detailVisible = ref(false)
const detailApp = ref<OAuthApplicationView | null>(null)

function openDetail(row: OAuthApplicationView): void {
  detailApp.value = row
  detailVisible.value = true
}

/* ------------------------------ 启用 / 停用 / 删除 ------------------------------ */

function confirmToggle(row: OAuthApplicationView, status: number): void {
  const disable = status === 3
  dialog.warning({
    title: disable ? '停用应用' : '启用应用',
    content: disable
      ? `停用后「${row.appName}」将无法再获取授权令牌，已授权用户令牌不受影响。`
      : `确认启用「${row.appName}」？启用后恢复授权码流程。`,
    positiveText: disable ? '停用' : '启用',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await oauthAppAdminApi.setStatus(row.id, status)
        message.success(disable ? '应用已停用' : '应用已启用')
        await load()
      } catch (error) {
        message.error(handleApiError(error, router))
      }
    },
  })
}

function confirmRemove(row: OAuthApplicationView): void {
  dialog.error({
    title: '删除应用',
    content: `确认删除「${row.appName}」？客户端凭证将立即失效，此操作无法恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await oauthAppAdminApi.remove(row.id)
        message.success('应用已删除')
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
    title="应用管理"
    description="审核用户提交的 OAuth 接入申请，并管理已接入应用的启用、停用与删除"
  >
    <template #extra>
      <n-button :loading="loading" :disabled="!oauthAppRegistrationEnabled" @click="load"
        >刷新</n-button
      >
    </template>

    <n-alert v-if="!oauthAppRegistrationEnabled" type="info" title="接入审核暂未开放"
      >自助 OAuth 接入服务尚未部署，暂不接受申请和审核。</n-alert
    >
    <n-tabs v-else v-model:value="activeTab" type="line" animated>
      <n-tab-pane
        name="pending"
        :tab="`待审核${pendingRows.length ? `（${pendingRows.length}）` : ''}`"
      />
      <n-tab-pane name="all" :tab="`全部应用（${rows.length}）`" />
    </n-tabs>

    <data-table
      v-if="oauthAppRegistrationEnabled"
      :columns="columns"
      :data="displayRows"
      :loading="loading"
      :row-key="(row: OAuthApplicationView) => row.id"
      :scroll-x="1400"
      :show-pagination="false"
    />

    <!-- 审核 -->
    <n-modal
      v-model:show="reviewVisible"
      preset="card"
      :title="reviewApp ? `审核 · ${reviewApp.appName}` : '审核应用'"
      style="width: 600px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
    >
      <template v-if="reviewApp">
        <div class="review-summary">
          <p><span class="review-label">申请人</span>{{ reviewApp.ownerName }}</p>
          <p><span class="review-label">权限范围</span>{{ scopeText(reviewApp) }}</p>
          <p><span class="review-label">回调地址</span>{{ reviewApp.redirectUris.join('、') }}</p>
          <p v-if="reviewApp.websiteUrl">
            <span class="review-label">应用主页</span>{{ reviewApp.websiteUrl }}
          </p>
          <p v-if="reviewApp.description">
            <span class="review-label">应用描述</span>{{ reviewApp.description }}
          </p>
        </div>

        <n-radio-group v-model:value="reviewApproved" style="margin: 16px 0">
          <n-radio :value="true">通过</n-radio>
          <n-radio :value="false">驳回</n-radio>
        </n-radio-group>

        <n-input
          v-model:value="reviewRemark"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="500"
          :placeholder="reviewApproved ? '审核备注（选填）' : '请填写驳回原因'"
        />

        <n-alert v-if="reviewApproved" type="info" :bordered="false" style="margin-top: 12px">
          通过后将立即为应用分配 Client ID，申请人可查看并重置客户端密钥。
        </n-alert>
      </template>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="reviewVisible = false">取消</n-button>
          <n-button type="primary" :loading="reviewSaving" @click="submitReview">提交审核</n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="classificationVisible"
      preset="card"
      title="应用信任分类"
      style="width: 520px; max-width: calc(100vw - 32px)"
      :mask-closable="!classificationSaving"
    >
      <n-alert type="warning" style="margin-bottom: 20px"
        >官方分类允许账号密码登录及具备积分 scope
        后增加积分。请核实应用归属；此操作由服务端再次校验超管身份并留痕。</n-alert
      >
      <p>{{ classificationApp?.appName }}</p>
      <n-select
        v-model:value="category"
        :options="categoryOptions"
        :disabled="classificationSaving"
      />
      <template #footer
        ><div class="modal-footer">
          <n-button :disabled="classificationSaving" @click="classificationVisible = false"
            >取消</n-button
          ><n-button type="primary" :loading="classificationSaving" @click="classify"
            >确认分类</n-button
          >
        </div></template
      >
    </n-modal>
    <!-- 详情 -->
    <n-modal
      v-model:show="detailVisible"
      preset="card"
      :title="detailApp ? detailApp.appName : '应用详情'"
      style="width: 600px; max-width: calc(100vw - 32px)"
    >
      <div v-if="detailApp" class="detail-body">
        <p>
          <span class="review-label">状态</span>
          <status-tag :meta="oauthAppStatusMeta(detailApp.status)" />
        </p>
        <p>
          <span class="review-label">Client ID</span
          ><code>{{ detailApp.clientId || '未分配' }}</code>
        </p>
        <p><span class="review-label">申请人</span>{{ detailApp.ownerName }}</p>
        <p><span class="review-label">权限范围</span>{{ scopeText(detailApp) }}</p>
        <p><span class="review-label">回调地址</span>{{ detailApp.redirectUris.join('、') }}</p>
        <p v-if="detailApp.websiteUrl">
          <span class="review-label">应用主页</span>{{ detailApp.websiteUrl }}
        </p>
        <p v-if="detailApp.description">
          <span class="review-label">应用描述</span>{{ detailApp.description }}
        </p>
        <p><span class="review-label">提交时间</span>{{ formatDateTime(detailApp.createTime) }}</p>
        <p v-if="detailApp.auditTime">
          <span class="review-label">审核时间</span>{{ formatDateTime(detailApp.auditTime) }}
        </p>
        <p v-if="detailApp.auditRemark">
          <span class="review-label">审核备注</span>{{ detailApp.auditRemark }}
        </p>
      </div>
    </n-modal>
  </page-container>
</template>

<style scoped>
.review-summary,
.detail-body {
  display: grid;
  gap: 10px;
}
.review-summary p,
.detail-body p {
  font-size: 13px;
  color: var(--yuna-gray-700);
  line-height: 1.7;
  overflow-wrap: anywhere;
  display: flex;
  gap: 10px;
}
.review-label {
  flex-shrink: 0;
  width: 76px;
  color: var(--yuna-gray-600);
}
.detail-body code {
  font-size: 12px;
  color: var(--yuna-gray-700);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
