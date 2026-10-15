<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NPagination, NSpin, NTabPane, NTabs, useDialog, useMessage } from 'naive-ui'
import { PageContainer, PageEmpty, SectionCard, StatusTag, formatRelative, noticeStatusMeta } from '@yuna/ui'
import { noticeApi } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(true)
const notices = ref<NoticeRecordView[]>([])
const filter = ref('all')
const readingId = ref<number | null>(null)
const markingAll = ref(false)

/** 后端 inbox 暂不支持按状态过滤，故一次性取回后在本地分页与筛选 */
const PAGE_SIZE = 10
const page = ref(1)

const filtered = computed(() => {
  if (filter.value === 'unread') return notices.value.filter((item) => item.status === 1)
  if (filter.value === 'read') return notices.value.filter((item) => item.status === 3)
  return notices.value
})

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const unreadCount = computed(() => notices.value.filter((item) => item.status === 1).length)

const emptyDescription = computed(() =>
  filter.value === 'all' ? '暂无站内信' : '没有符合条件的站内信',
)

watch(filter, () => {
  page.value = 1
})

async function load(): Promise<void> {
  loading.value = true
  try {
    notices.value = (await noticeApi.inbox({ page: 1, size: 100 })).records
    page.value = 1
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

async function markRead(notice: NoticeRecordView): Promise<void> {
  if (notice.status === 3) return
  readingId.value = notice.id
  try {
    await noticeApi.markRead(notice.noticeId)
    notice.status = 3
    message.success('已标记为已读')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    readingId.value = null
  }
}

/** 一键全部已读：后端暂无批量接口，逐条幂等调用 */
function confirmMarkAllRead(): void {
  if (!unreadCount.value) {
    message.info('没有未读的站内信')
    return
  }
  dialog.warning({
    title: '全部标记已读',
    content: `确认将 ${unreadCount.value} 条未读站内信全部标记为已读？`,
    positiveText: '全部已读',
    negativeText: '取消',
    onPositiveClick: markAllRead,
  })
}

async function markAllRead(): Promise<void> {
  markingAll.value = true
  try {
    const unread = notices.value.filter((item) => item.status === 1)
    for (const item of unread) {
      await noticeApi.markRead(item.noticeId)
      item.status = 3
    }
    message.success(`已将 ${unread.length} 条站内信标记为已读`)
  } catch (error) {
    message.error(handleApiError(error, router))
    await load()
  } finally {
    markingAll.value = false
  }
}

/** 进入单条通知详情页，便于查看超长通知 */
function openDetail(notice: NoticeRecordView): void {
  void router.push({ name: 'message-detail', params: { noticeId: String(notice.noticeId) } })
}

onMounted(load)
</script>

<template>
  <page-container title="站内信" description="系统通知与安全提醒">
    <template #extra>
      <n-button
        secondary
        type="primary"
        :disabled="!unreadCount"
        :loading="markingAll"
        @click="confirmMarkAllRead"
      >
        全部已读
      </n-button>
      <n-button quaternary :loading="loading" @click="load">刷新</n-button>
    </template>

    <template #tabs>
      <n-tabs v-model:value="filter" type="line" size="small" style="max-width: 320px">
        <n-tab-pane name="all" tab="全部" />
        <n-tab-pane name="unread" :tab="`未读${unreadCount ? ` (${unreadCount})` : ''}`" />
        <n-tab-pane name="read" tab="已读" />
      </n-tabs>
    </template>

    <section-card flush>
      <n-spin :show="loading">
        <page-empty v-if="!filtered.length" :description="emptyDescription" />
        <ul v-else class="msg-list">
          <li
            v-for="item in paged"
            :key="item.id"
            class="msg"
            :class="{ 'is-unread': item.status === 1 }"
            role="button"
            tabindex="0"
            @click="openDetail(item)"
            @keydown.enter="openDetail(item)"
          >
            <div class="msg__main">
              <div class="msg__head">
                <span class="msg__title">{{ item.title || '（无标题）' }}</span>
                <status-tag :meta="noticeStatusMeta(item.status)" />
              </div>
              <p class="msg__content">{{ item.content || '（无正文）' }}</p>
              <div class="msg__foot">
                <span>{{ item.channelLabel || '站内信' }}</span>
                <span>{{ formatRelative(item.createTime) }}</span>
              </div>
            </div>
            <n-button
              text
              type="primary"
              size="small"
              :disabled="item.status === 3"
              :loading="readingId === item.id"
              @click.stop="markRead(item)"
            >
              标记已读
            </n-button>
          </li>
        </ul>
      </n-spin>

      <div v-if="filtered.length > PAGE_SIZE" class="msg-pager">
        <n-pagination
          v-model:page="page"
          :page-size="PAGE_SIZE"
          :item-count="filtered.length"
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
  cursor: pointer;
  border-bottom: 1px solid var(--yuna-gray-200);
  transition: background-color 0.15s ease;
}

.msg:hover {
  background: var(--yuna-gray-50);
}

.msg:focus-visible {
  background: var(--yuna-gray-50);
  outline: none;
  box-shadow: inset 0 0 0 2px var(--yuna-blue-100);
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
  font-size: 14px;
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.msg.is-unread .msg__title {
  font-weight: 600;
}

.msg__content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--yuna-gray-700);
}

.msg__foot {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--yuna-gray-600);
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
