<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NEmpty,
  NInput,
  NPagination,
  NSelect,
  NSkeleton,
  useDialog,
  useMessage,
} from 'naive-ui'
import {
  FilterBar,
  PageContainer,
  StatusTag,
  appealStatusMeta,
  formatDateTime,
  formatRelative,
} from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import type { AppealView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

type AuditAction = 'approve' | 'reject'
const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const filters = reactive<{ status: number | null }>({ status: 0 })
const rows = ref<AppealView[]>([])
const loading = ref(false)
const auditing = ref(false)
const loadError = ref('')
const total = ref(0)
const page = ref(1)
const size = ref(20)
const selectedId = ref<number | null>(Number(route.query.appeal) || null)
const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? null)
const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
]
const canAudit = (row: AppealView): boolean => row.status === 0

let loadSequence = 0
async function load(): Promise<void> {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await authAdminApi.listAppeals({
      page: page.value,
      size: size.value,
      status: filters.status ?? undefined,
    })
    if (sequence !== loadSequence) return
    const lastPage = Math.max(1, Math.ceil(result.total / size.value))
    if (page.value > lastPage) {
      page.value = lastPage
      await load()
      return
    }
    rows.value = result.records
    total.value = result.total
    if (!rows.value.some((row) => row.id === selectedId.value))
      selectedId.value = rows.value[0]?.id ?? null
  } catch (error) {
    if (sequence === loadSequence) loadError.value = handleApiError(error, router)
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function runAudit(row: AppealView, action: AuditAction, remark: string): Promise<boolean> {
  if (auditing.value) return false
  auditing.value = true
  try {
    const payload = remark ? { remark } : {}
    if (action === 'approve') await authAdminApi.approveAppeal(row.id, payload)
    else await authAdminApi.rejectAppeal(row.id, payload)
    message.success(action === 'approve' ? '申诉已通过，账号已解锁' : '申诉已驳回')
    await load()
    return true
  } catch (error) {
    message.error(handleApiError(error, router))
    return false
  } finally {
    auditing.value = false
  }
}

function confirmAudit(row: AppealView, action: AuditAction): void {
  const remark = ref('')
  const approve = action === 'approve'
  dialog[approve ? 'success' : 'warning']({
    title: approve ? '通过申诉并解锁账号' : '驳回申诉',
    content: () =>
      h('div', [
        h(
          'p',
          null,
          approve
            ? `确认通过「${row.username ?? '该用户'}」的申诉？通过后将自动解锁账号。`
            : `确认驳回「${row.username ?? '该用户'}」的申诉？`,
        ),
        h(NInput, {
          value: remark.value,
          type: 'textarea',
          placeholder: '审核备注（选填，最多 500 字）',
          maxlength: 500,
          autosize: { minRows: 3, maxRows: 6 },
          'aria-label': '审核备注',
          'onUpdate:value': (value: string) => {
            remark.value = value
          },
        }),
      ]),
    positiveText: approve ? '通过并解锁' : '确认驳回',
    negativeText: '取消',
    onPositiveClick: () => runAudit(row, action, remark.value.trim()),
  })
}
function search(): void {
  page.value = 1
  void load()
}
function reset(): void {
  filters.status = 0
  search()
}
function onPageChange(next: number): void {
  page.value = next
  void load()
}
function onSizeChange(next: number): void {
  size.value = next
  search()
}

onMounted(load)
</script>

<template>
  <page-container title="申诉审核" description="选择申请，阅读完整说明后决定是否解锁账号。">
    <template #extra
      ><n-button :loading="loading" :disabled="auditing" @click="load">刷新</n-button></template
    >
    <filter-bar :loading="loading" @search="search" @reset="reset">
      <n-select
        v-model:value="filters.status"
        :options="statusOptions"
        placeholder="全部状态"
        clearable
        class="status-filter"
        aria-label="申诉状态"
      />
    </filter-bar>
    <n-alert v-if="loadError" type="error" title="申诉加载失败"
      >{{ loadError }}
      <div class="error-actions"><n-button size="small" @click="load">重试</n-button></div></n-alert
    >
    <div v-else class="review-layout" :aria-busy="loading">
      <section class="review-queue" aria-label="申诉列表">
        <div class="queue-heading">
          <h2>申请列表</h2>
          <span>共 {{ total }} 条</span>
        </div>
        <div v-if="loading" class="queue-loading">
          <n-skeleton v-for="item in 4" :key="item" height="96px" />
        </div>
        <n-empty v-else-if="!rows.length" class="empty-state" description="当前条件下没有申诉" />
        <ul v-else class="queue-list">
          <li v-for="row in rows" :key="row.id">
            <button
              type="button"
              class="queue-item"
              :class="{ 'is-selected': selectedId === row.id }"
              :aria-pressed="selectedId === row.id"
              @click="selectedId = row.id"
            >
              <span class="queue-item-heading"
                ><strong>{{ row.username || '未关联用户' }}</strong
                ><status-tag :meta="appealStatusMeta(row.status)"
              /></span>
              <span class="queue-preview">{{ row.appealReason || '未填写申诉说明' }}</span>
              <span class="queue-time">{{ formatRelative(row.createTime) }} · #{{ row.id }}</span>
            </button>
          </li>
        </ul>
      </section>
      <section class="review-detail" aria-label="申诉详情">
        <n-skeleton v-if="loading" text :repeat="8" />
        <template v-else-if="selected">
          <div class="detail-heading">
            <div>
              <span class="eyebrow">申诉 #{{ selected.id }}</span>
              <h2>{{ selected.username || '未关联用户' }}</h2>
            </div>
            <status-tag :meta="appealStatusMeta(selected.status)" />
          </div>
          <dl class="detail-facts">
            <div>
              <dt>关联账号</dt>
              <dd>{{ selected.userId ? `用户 ID ${selected.userId}` : '无关联账号' }}</dd>
            </div>
            <div>
              <dt>联系方式</dt>
              <dd>{{ selected.contact || '未填写' }}</dd>
            </div>
            <div>
              <dt>提交时间</dt>
              <dd>{{ formatDateTime(selected.createTime) }}</dd>
            </div>
          </dl>
          <div class="detail-section">
            <h3>申诉说明</h3>
            <p class="reason">{{ selected.appealReason || '未填写申诉说明' }}</p>
          </div>
          <div v-if="canAudit(selected)" class="audit-actions">
            <p>通过后将自动解锁对应账号，请核实申请人身份和申诉内容。</p>
            <div>
              <n-button :disabled="auditing" @click="confirmAudit(selected, 'reject')"
                >驳回申诉</n-button
              ><n-button
                type="primary"
                :loading="auditing"
                @click="confirmAudit(selected, 'approve')"
                >通过并解锁</n-button
              >
            </div>
          </div>
          <div v-else class="detail-section">
            <h3>审核结果</h3>
            <dl class="detail-facts">
              <div>
                <dt>审核人</dt>
                <dd>{{ selected.auditor || '未记录' }}</dd>
              </div>
              <div>
                <dt>审核时间</dt>
                <dd>{{ formatDateTime(selected.auditTime) }}</dd>
              </div>
              <div>
                <dt>审核备注</dt>
                <dd class="reason">{{ selected.auditRemark || '未填写' }}</dd>
              </div>
            </dl>
          </div>
        </template>
        <n-empty v-else class="empty-state" description="选择一条申请查看详情" />
      </section>
    </div>
    <div v-if="total && !loadError" class="pagination">
      <n-pagination
        :page="page"
        :page-size="size"
        :item-count="total"
        :page-sizes="[10, 20, 50]"
        :page-slot="5"
        show-size-picker
        :disabled="loading || auditing"
        @update:page="onPageChange"
        @update:page-size="onSizeChange"
      />
    </div>
  </page-container>
</template>

<style scoped>
.error-actions {
  margin-top: 12px;
}
.status-filter {
  width: 180px;
  max-width: 100%;
}
.review-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.4fr);
  gap: 20px;
  align-items: start;
}
.review-queue,
.review-detail {
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  overflow: hidden;
}
.queue-heading,
.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.queue-heading {
  padding: 18px 20px;
  border-bottom: 1px solid var(--yuna-gray-200);
}
h2,
h3,
p {
  margin: 0;
}
h2 {
  font-size: 16px;
  color: var(--yuna-gray-900);
}
h3 {
  font-size: 14px;
  color: var(--yuna-gray-900);
  margin-bottom: 12px;
}
.queue-status,
.queue-heading > span,
.eyebrow,
.queue-time {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 640px;
  overflow: auto;
}
.queue-list li + li {
  border-top: 1px solid var(--yuna-gray-200);
}
.queue-item {
  width: 100%;
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  text-align: left;
  color: var(--yuna-gray-900);
  cursor: pointer;
  font: inherit;
}
.queue-item:hover {
  background: var(--yuna-gray-50);
}
.queue-item.is-selected {
  background: var(--yuna-gray-100);
  border-left-color: var(--yuna-primary);
}
.queue-item:focus-visible {
  outline: 2px solid var(--yuna-primary);
  outline-offset: -3px;
}
.queue-item-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.queue-item-heading strong {
  font-weight: 500;
  overflow-wrap: anywhere;
}
.queue-preview {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;
  color: var(--yuna-gray-700);
  overflow-wrap: anywhere;
}
.review-detail {
  padding: 20px;
  min-height: 320px;
}
.detail-heading {
  margin-bottom: 24px;
}
.detail-heading h2 {
  margin-top: 5px;
  font-size: 22px;
}
.detail-facts {
  display: grid;
  gap: 14px;
  margin: 0;
}
.detail-facts > div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  line-height: 1.7;
}
dt {
  color: var(--yuna-gray-600);
}
dd {
  color: var(--yuna-gray-900);
  margin: 0;
  overflow-wrap: anywhere;
}
.detail-section {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--yuna-gray-200);
}
.reason {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--yuna-gray-700);
  line-height: 1.8;
}
.audit-actions {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--yuna-gray-200);
}
.audit-actions p {
  font-size: 13px;
  color: var(--yuna-gray-600);
  line-height: 1.7;
}
.audit-actions > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.empty-state {
  padding: 48px 16px;
}
.queue-loading {
  display: grid;
  gap: 12px;
  padding: 20px;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  overflow-x: auto;
  padding: 8px 0;
}
@media (max-width: 900px) {
  .review-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .queue-list {
    max-height: 360px;
  }
}
@media (max-width: 600px) {
  .review-detail {
    padding: 20px;
  }
  .detail-facts > div {
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 10px;
  }
}
</style>
