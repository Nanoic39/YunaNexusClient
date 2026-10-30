<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NPagination,
  NSpin,
  NTabPane,
  NTabs,
  useDialog,
  useMessage,
} from 'naive-ui'
import { PageContainer, PageEmpty, SectionCard, formatRelative } from '@yuna/ui'
import { noticeApi, noticeRevision, session } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter(),
  message = useMessage(),
  dialog = useDialog()
const loading = ref(true),
  notices = ref<NoticeRecordView[]>([]),
  total = ref(0),
  filter = ref('all')
const summary = ref({ total: 0, unread: 0 }),
  error = ref(''),
  readingId = ref<number | null>(null),
  markingAll = ref(false)
const PAGE_SIZE = 10,
  page = ref(1)
const unreadCount = computed(() => summary.value.unread)
const filtered = notices,
  paged = notices
const emptyDescription = computed(() =>
  filter.value === 'all' ? '暂无站内信' : '没有符合条件的站内信',
)
let alive = true,
  generation = 0,
  controller: AbortController | undefined
const identity = () => `${session.state.externalId}|${session.state.clientCode}`
function onPageChange(next: number) {
  page.value = next
  void load()
}
async function load(): Promise<void> {
  const version = ++generation,
    account = identity()
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    const [result, counts] = await Promise.all([
      noticeApi.inbox(
        {
          page: page.value,
          size: PAGE_SIZE,
          status: filter.value === 'unread' ? 1 : filter.value === 'read' ? 3 : undefined,
        },
        signal,
      ),
      noticeApi.summary(signal),
    ])
    if (!alive || version !== generation || account !== identity()) return
    const last = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
    if (page.value > last) {
      page.value = last
      await load()
      return
    }
    notices.value = result.records
    total.value = result.total
    summary.value = counts
  } catch (cause) {
    if (alive && version === generation && account === identity() && !signal.aborted)
      error.value = handleApiError(cause, router)
  } finally {
    if (alive && version === generation) loading.value = false
  }
}
async function markRead(notice: NoticeRecordView): Promise<void> {
  if (notice.status === 3 || readingId.value !== null || markingAll.value) return
  const account = identity()
  readingId.value = notice.id
  try {
    await noticeApi.markRead(notice.noticeId)
    if (!alive || account !== identity()) return
    await load()
    message.success('已标记为已读')
  } catch (cause) {
    if (alive && account === identity()) message.error(handleApiError(cause, router))
  } finally {
    if (alive) readingId.value = null
  }
}
function confirmMarkAllRead() {
  if (!unreadCount.value || markingAll.value || loading.value || error.value) return
  dialog.warning({
    title: '全部标记已读',
    content: `将当前账号所有已送达的未读站内信标记已读（当前 ${unreadCount.value} 条），不限于本页。`,
    positiveText: '全部已读',
    negativeText: '取消',
    onPositiveClick: markAllRead,
  })
}
async function markAllRead() {
  if (markingAll.value) return
  const account = identity()
  markingAll.value = true
  try {
    const result = await noticeApi.markAllRead()
    if (!alive || account !== identity()) return
    await load()
    message.success(`已将 ${result.changed} 条站内信标记为已读`)
  } catch (cause) {
    if (alive && account === identity()) message.error(handleApiError(cause, router))
  } finally {
    if (alive) markingAll.value = false
  }
}
function openDetail(notice: NoticeRecordView) {
  void router.push({ name: 'message-detail', params: { noticeId: String(notice.noticeId) } })
}
watch(filter, () => {
  page.value = 1
  void load()
})
watch(noticeRevision, () => {
  if (readingId.value === null && !markingAll.value) void load()
})
watch(identity, () => {
  ++generation
  controller?.abort()
  notices.value = []
  summary.value = { total: 0, unread: 0 }
  total.value = 0
  if (session.state.accessToken) void load()
})
onMounted(load)
onBeforeUnmount(() => {
  alive = false
  ++generation
  controller?.abort()
})
</script>

<template>
  <page-container title="站内信" description="系统通知与安全提醒；查看系统通知与安全提醒">
    <template #extra>
      <n-button
        secondary
        type="primary"
        :disabled="loading || !!error || !unreadCount || readingId !== null"
        :loading="markingAll"
        @click="confirmMarkAllRead"
      >
        全部已读
      </n-button>
      <n-button quaternary :loading="loading" @click="load">刷新</n-button>
    </template>

    <template #tabs>
      <n-tabs v-model:value="filter" type="line" size="small" style="max-width: 320px">
        <n-tab-pane name="all"
          ><template #tab>全部 ({{ summary.total }})</template></n-tab-pane
        >
        <n-tab-pane name="unread"
          ><template #tab>未读 ({{ unreadCount }})</template></n-tab-pane
        >
        <n-tab-pane name="read"
          ><template #tab>已读 ({{ summary.total - unreadCount }})</template></n-tab-pane
        >
      </n-tabs>
    </template>

    <section-card flush>
      <n-alert v-if="error" type="error" role="alert">{{ error }}</n-alert>
      <n-spin :show="loading">
        <page-empty v-if="!filtered.length && !error" :description="emptyDescription" />
        <ul v-else class="msg-list">
          <li
            v-for="item in paged"
            :key="item.id"
            class="msg"
            :class="{ 'is-unread': item.status === 1 }"
          >
            <div class="msg__main">
              <div class="msg__head">
                <button class="msg__title" @click="openDetail(item)">
                  {{ item.title || '（无标题）' }}
                </button>
                <span class="msg__status">{{ item.status === 1 ? '未读' : '已读' }}</span>
              </div>
              <p class="msg__content">{{ item.content || '（无正文）' }}</p>
              <div class="msg__foot">
                <span>{{ item.channelLabel || '站内信' }}</span>
                <span>{{ formatRelative(item.createTime) }}</span>
              </div>
            </div>
            <n-button
              v-if="item.status === 1"
              size="small"
              :disabled="loading || markingAll || readingId !== null"
              :loading="readingId === item.id"
              @click.stop="markRead(item)"
            >
              标记已读
            </n-button>
          </li>
        </ul>
      </n-spin>

      <div v-if="total > PAGE_SIZE" class="msg-pager">
        <n-pagination
          :page="page"
          :disabled="loading || markingAll || readingId !== null"
          @update:page="onPageChange"
          :page-size="PAGE_SIZE"
          :item-count="total"
          :page-slot="7"
        />
      </div>
    </section-card>
  </page-container>
</template>

<style scoped>
.msg-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.msg {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--yuna-gray-200);
  transition: background-color 0.15s ease;
}

.msg:hover {
  background: var(--yuna-gray-50);
}

.msg__title:focus-visible {
  outline: 2px solid var(--yuna-primary);
  outline-offset: 3px;
}

.msg:last-child {
  border-bottom: none;
}

.msg__main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.msg__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg__title {
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.msg__title:hover {
  color: var(--yuna-primary);
}
.msg__status {
  color: var(--yuna-gray-700);
  font-size: 12px;
  white-space: nowrap;
}
.msg.is-unread .msg__title {
  font-weight: 600;
}

.msg__content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--yuna-gray-700);
}

.msg__foot {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--yuna-gray-700);
}

.msg-pager {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid var(--yuna-gray-200);
}

/* 窄屏：正文与操作按钮纵向堆叠，避免挤压 */
@media (max-width: 768px) {
  .msg {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 14px 16px;
  }

  .msg :deep(.n-button) {
    align-self: flex-start;
  }

  .msg-pager {
    justify-content: center;
  }
}
</style>
