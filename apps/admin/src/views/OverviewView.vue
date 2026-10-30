<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton, NEmpty, NSkeleton, useMessage } from 'naive-ui'
import { MetricCard, PageContainer, SectionCard, formatDateTime, openContextMenu } from '@yuna/ui'
import type { ContextMenuItem } from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import type { AppealView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const loading = ref(true)
const loadError = ref('')
const userTotal = ref<number | null>(null)
const userEnabled = ref<number | null>(null)
const userDisabled = ref<number | null>(null)
const appealPending = ref<number | null>(null)
const pendingAppeals = ref<AppealView[]>([])

async function refresh(): Promise<void> {
  if (loading.value && userTotal.value !== null) return
  loading.value = true
  loadError.value = ''
  try {
    const [all, enabled, disabled, pending] = await Promise.all([
      authAdminApi.listUsers({ page: 1, size: 1 }),
      authAdminApi.listUsers({ page: 1, size: 1, status: 1 }),
      authAdminApi.listUsers({ page: 1, size: 1, status: 0 }),
      authAdminApi.listAppeals({ page: 1, size: 5, status: 0 }),
    ])
    userTotal.value = all.total
    userEnabled.value = enabled.total
    userDisabled.value = disabled.total
    appealPending.value = pending.total
    pendingAppeals.value = pending.records
  } catch (error) {
    loadError.value = handleApiError(error, router)
  } finally {
    loading.value = false
  }
}

async function copyMetrics(): Promise<void> {
  const rows = [
    ['用户总数', userTotal.value],
    ['正常账号', userEnabled.value],
    ['禁用账号', userDisabled.value],
    ['待处理申诉', appealPending.value],
  ]
  try {
    await navigator.clipboard.writeText(
      ['指标,数值', ...rows.map(([name, value]) => `${name},${value ?? ''}`)].join('\n'),
    )
    message.success('指标已复制，可粘贴到电子表格')
  } catch {
    message.error('复制失败，请检查浏览器剪贴板权限')
  }
}

function onDashboardContextMenu(event: MouseEvent): void {
  const items: ContextMenuItem[] = [
    {
      key: 'copy-csv',
      label: '复制看板数据（CSV）',
      icon: 'export',
      onSelect: () => void copyMetrics(),
    },
    {
      key: 'refresh',
      label: '刷新看板数据',
      icon: 'refresh',
      divider: true,
      onSelect: () => void refresh(),
    },
  ]
  event.preventDefault()
  openContextMenu({ x: event.clientX, y: event.clientY, items, opener: null })
}

onMounted(refresh)
</script>

<template>
  <page-container title="工作概览" description="先处理待办，再查看平台账号概况。">
    <template #extra>
      <n-button :disabled="loading || !!loadError" @click="copyMetrics">复制指标</n-button>
      <n-button :loading="loading" @click="refresh">刷新</n-button>
    </template>
    <n-alert v-if="loadError" type="error" title="概览加载失败">
      {{ loadError }}
      <div class="error-actions"><n-button size="small" @click="refresh">重试</n-button></div>
    </n-alert>

    <div class="yuna-metric-grid" @contextmenu="onDashboardContextMenu">
      <metric-card label="待处理申诉" :value="appealPending" unit="条" :loading="loading" />
      <metric-card label="用户总数" :value="userTotal" unit="个" :loading="loading" />
      <metric-card label="正常账号" :value="userEnabled" unit="个" :loading="loading" />
      <metric-card label="禁用账号" :value="userDisabled" unit="个" :loading="loading" />
    </div>

    <div class="overview-layout">
      <section-card
        title="申诉待办"
        description="最近提交的 5 条解锁申请，打开后可查看完整说明并审核。"
      >
        <template #extra
          ><n-button text @click="router.push('/appeals')">全部申诉 →</n-button></template
        >
        <div v-if="loading" class="task-list" aria-label="正在加载申诉">
          <n-skeleton v-for="item in 3" :key="item" height="76px" />
        </div>
        <n-empty v-else-if="loadError" description="待办数据暂不可用" />
        <n-empty v-else-if="!pendingAppeals.length" description="暂无待处理申诉" />
        <ul v-else class="task-list">
          <li v-for="appeal in pendingAppeals" :key="appeal.id" class="task-item">
            <div class="task-copy">
              <strong>{{ appeal.username || '未关联用户' }}</strong>
              <p>{{ appeal.appealReason || '未填写申诉说明' }}</p>
              <time>{{ formatDateTime(appeal.createTime) }}</time>
            </div>
            <n-button
              @click="router.push({ path: '/appeals', query: { appeal: String(appeal.id) } })"
              >查看申诉</n-button
            >
          </li>
        </ul>
      </section-card>

      <section-card title="常用工作" description="按要完成的事情进入。">
        <nav class="work-links" aria-label="常用管理工作">
          <router-link to="/users"
            ><strong>管理账号</strong><span>查找用户、调整状态与角色</span
            ><span aria-hidden="true">→</span></router-link
          >
          <router-link to="/oauth-apps"
            ><strong>审核接入应用</strong><span>检查授权范围与回调地址</span
            ><span aria-hidden="true">→</span></router-link
          >
          <router-link to="/notice/send"
            ><strong>发送通知</strong><span>选择模板并确认接收人</span
            ><span aria-hidden="true">→</span></router-link
          >
          <router-link to="/audit-logs"
            ><strong>查看操作记录</strong><span>追踪管理操作与处理结果</span
            ><span aria-hidden="true">→</span></router-link
          >
        </nav>
      </section-card>
    </div>
  </page-container>
</template>

<style scoped>
.error-actions {
  margin-top: 12px;
}
.overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr);
  gap: 20px;
  align-items: start;
}
.task-list {
  display: grid;
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--yuna-gray-200);
}
.task-item:first-child {
  padding-top: 0;
}
.task-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.task-copy {
  flex: 1;
  min-width: 0;
}
.task-copy strong {
  color: var(--yuna-gray-900);
  font-size: 14px;
}
.task-copy p {
  color: var(--yuna-gray-700);
  margin: 7px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.task-copy time {
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.work-links {
  display: grid;
  gap: 4px;
}
.work-links a {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 12px;
  color: var(--yuna-gray-900);
  padding: 14px 12px;
  border-radius: var(--yuna-radius-md);
  text-decoration: none;
}
.work-links a:hover {
  background: var(--yuna-gray-100);
}
.work-links a:focus-visible {
  outline: 2px solid var(--yuna-primary);
  outline-offset: 2px;
}
.work-links strong {
  font-weight: 500;
}
.work-links span:nth-child(2) {
  grid-row: 2;
  color: var(--yuna-gray-600);
  font-size: 12px;
}
.work-links span:last-child {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  color: var(--yuna-gray-500);
}
@media (max-width: 1000px) {
  .overview-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .task-item {
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
