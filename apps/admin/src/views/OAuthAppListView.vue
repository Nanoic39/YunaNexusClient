<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NDropdown,
  NEmpty,
  NSkeleton,
  NInput,
  NSelect,
  NModal,
  NRadio,
  NRadioGroup,
  NTabPane,
  NTabs,
  useDialog,
  useMessage,
} from 'naive-ui'
import { PageContainer, StatusTag, formatDateTime, oauthAppStatusMeta } from '@yuna/ui'
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
const keyword = ref('')
const loadError = ref('')
const statusFilter = ref<number | null>(null)
const statusOptions = [
  { label: '待审核', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
  { label: '已停用', value: 3 },
]

const pendingRows = computed(() => rows.value.filter((row) => row.status === 0))
const displayRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  const source = activeTab.value === 'pending' ? pendingRows.value : rows.value
  return source.filter(
    (row) =>
      (activeTab.value === 'pending' ||
        statusFilter.value === null ||
        row.status === statusFilter.value) &&
      (!text ||
        [row.appName, row.ownerName, row.clientId ?? ''].some((value) =>
          value.toLowerCase().includes(text),
        )),
  )
})

function scopeText(app: OAuthApplicationView): string {
  return app.scopes.map((scope) => OAUTH_SCOPE_LABELS[scope] ?? scope).join('、')
}

/* ------------------------------ 列表 ------------------------------ */

function appActions(row: OAuthApplicationView) {
  const options = []
  if (canClassify.value && (row.status === 1 || row.status === 3))
    options.push({ label: '应用分类', key: 'classify' })
  if (row.status === 1) options.push({ label: '停用应用', key: 'disable' })
  if (row.status === 3) options.push({ label: '启用应用', key: 'enable' })
  options.push({ label: '删除应用', key: 'remove' })
  return options
}
function onAppAction(key: string | number, row: OAuthApplicationView): void {
  if (key === 'classify') openClassification(row)
  if (key === 'disable') confirmToggle(row, 3)
  if (key === 'enable') confirmToggle(row, 1)
  if (key === 'remove') confirmRemove(row)
}

let loadSequence = 0
async function load(): Promise<void> {
  if (!oauthAppRegistrationEnabled) return
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await oauthAppAdminApi.list()
    if (sequence !== loadSequence) return
    rows.value = result
  } catch (error) {
    if (sequence === loadSequence) loadError.value = handleApiError(error, router)
  } finally {
    if (sequence === loadSequence) loading.value = false
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
  <page-container title="应用管理" description="先核实申请的权限与回调地址，再决定是否允许接入。">
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

    <template v-if="oauthAppRegistrationEnabled">
      <div class="app-tools">
        <n-input
          v-model:value="keyword"
          placeholder="搜索应用、申请人或 Client ID"
          clearable
          class="app-search"
          aria-label="搜索接入应用"
        />
        <n-select
          v-if="activeTab === 'all'"
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="全部状态"
          clearable
          class="app-status"
          aria-label="应用状态"
        />
        <span class="result-count"
          >{{ displayRows.length }} 个{{ activeTab === 'pending' ? '待审核申请' : '应用' }}</span
        >
      </div>
      <n-alert v-if="loadError" type="error" title="应用加载失败"
        >{{ loadError }}
        <div class="error-actions">
          <n-button size="small" @click="load">重试</n-button>
        </div></n-alert
      >
      <div v-else-if="loading" class="app-loading" aria-label="正在加载应用">
        <n-skeleton v-for="item in 4" :key="item" height="120px" />
      </div>
      <n-empty
        v-else-if="!displayRows.length"
        class="empty-state"
        :description="
          keyword.trim() || statusFilter !== null
            ? '没有匹配的应用，请调整筛选条件'
            : activeTab === 'pending'
              ? '暂无待审核申请'
              : '暂无接入应用'
        "
      />
      <div v-else class="application-list">
        <article v-for="row in displayRows" :key="row.id" class="application-item">
          <div class="application-heading">
            <div>
              <h2>{{ row.appName }}</h2>
              <code>{{ row.clientId || '审核通过后分配 Client ID' }}</code>
            </div>
            <status-tag :meta="oauthAppStatusMeta(row.status)" />
          </div>
          <p v-if="row.description" class="application-description">{{ row.description }}</p>
          <div class="application-facts">
            <div>
              <span>申请人</span><strong>{{ row.ownerName || `#${row.ownerUserId}` }}</strong>
            </div>
            <div>
              <span>申请权限</span><strong>{{ scopeText(row) || '未申请权限' }}</strong>
            </div>
            <div>
              <span>回调地址</span
              ><strong
                >{{ row.redirectUris[0] || '未填写'
                }}<template v-if="row.redirectUris.length > 1">
                  等 {{ row.redirectUris.length }} 个</template
                ></strong
              >
            </div>
          </div>
          <footer class="application-footer">
            <time>提交于 {{ formatDateTime(row.createTime) }}</time>
            <div>
              <n-button v-if="row.status === 0" size="small" type="primary" @click="openReview(row)"
                >审核申请</n-button
              ><n-button size="small" @click="openDetail(row)">查看详情</n-button
              ><n-dropdown
                trigger="click"
                :options="appActions(row)"
                @select="onAppAction($event, row)"
                ><n-button size="small" quaternary :aria-label="`${row.appName}的更多操作`"
                  >更多</n-button
                ></n-dropdown
              >
            </div>
          </footer>
        </article>
      </div>
    </template>

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

        <n-radio-group
          v-model:value="reviewApproved"
          name="review-decision"
          aria-label="审核决定"
          style="margin: 16px 0"
        >
          <n-radio :value="true">通过</n-radio>
          <n-radio :value="false">驳回</n-radio>
        </n-radio-group>

        <n-input
          v-model:value="reviewRemark"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="500"
          aria-label="审核备注"
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
        aria-label="应用信任分类"
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
.error-actions {
  margin-top: 12px;
}
.app-tools {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.app-search {
  width: 340px;
  max-width: 100%;
}
.app-status {
  width: 150px;
}
.result-count {
  color: var(--yuna-gray-600);
  font-size: 13px;
  margin-left: auto;
}
.application-list,
.app-loading {
  display: grid;
  gap: 12px;
}
.application-item {
  padding: 20px;
  min-width: 0;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
}
.application-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.application-heading > div {
  min-width: 0;
}
.application-heading h2 {
  margin: 0 0 4px;
  color: var(--yuna-gray-900);
  font-size: 16px;
  overflow-wrap: anywhere;
}
.application-heading code {
  font-size: 12px;
  color: var(--yuna-gray-600);
  overflow-wrap: anywhere;
}
.application-description {
  margin: 12px 0 0;
  color: var(--yuna-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.application-facts {
  display: grid;
  grid-template-columns: minmax(120px, 0.6fr) minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
  margin: 16px 0;
}
.application-facts > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.application-facts span {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.application-facts strong {
  font-weight: 400;
  font-size: 13px;
  color: var(--yuna-gray-900);
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.application-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--yuna-gray-200);
}
.application-footer time {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.application-footer > div {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.empty-state {
  padding: 60px 16px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
}
@media (min-width: 1100px) {
  .application-item {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) minmax(260px, 1.3fr) minmax(180px, auto);
    gap: 4px 20px;
    padding: 16px 20px;
    align-items: center;
  }
  .application-heading {
    grid-column: 1;
    grid-row: 1;
    align-self: end;
  }
  .application-heading h2 {
    font-size: 14px;
  }
  .application-description {
    grid-column: 1;
    grid-row: 2;
    margin: 0;
    font-size: 12px;
    align-self: start;
  }
  .application-facts {
    grid-column: 2;
    grid-row: 1 / 3;
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
    margin: 0;
  }
  .application-facts > div {
    grid-template-columns: 60px minmax(0, 1fr);
    gap: 8px;
  }
  .application-footer {
    grid-column: 3;
    grid-row: 1 / 3;
    flex-direction: column-reverse;
    align-items: flex-end;
    justify-content: center;
    gap: 10px;
    padding: 0;
    border: 0;
    max-width: 230px;
  }
}
@media (max-width: 700px) {
  .application-facts {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .application-facts > div {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
  .application-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .application-footer > div {
    align-self: flex-end;
  }
  .application-item {
    padding: 16px;
  }
  .result-count {
    margin-left: 0;
  }
}
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
