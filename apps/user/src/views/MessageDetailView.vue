<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpin, useMessage } from 'naive-ui'
import {
  PageContainer,
  PageEmpty,
  SectionCard,
  StatusTag,
  formatDateTime,
  noticeStatusMeta,
} from '@yuna/ui'
import { noticeApi } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(true)
const notice = ref<NoticeRecordView | null>(null)

const noticeId = computed(() => Number(route.params.noticeId))

/** 进入详情即视为已读（幂等，失败静默，不阻断阅读） */
async function markRead(): Promise<void> {
  const current = notice.value
  if (!current || current.status === 3) return
  try {
    await noticeApi.markRead(current.noticeId)
    current.status = 3
  } catch {
    /* 静默 */
  }
}

/** 按 ID 加载本人通知，避免较旧通知因分页而显示不存在。 */
async function load(): Promise<void> {
  loading.value = true
  try {
    notice.value = await noticeApi.detail(noticeId.value)
    await markRead()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <page-container title="通知详情" description="完整查看单条站内通知">
    <template #extra>
      <n-button quaternary @click="router.back()">返回</n-button>
    </template>

    <n-spin :show="loading">
      <section-card v-if="notice" :title="notice.title || '（无标题）'">
        <template #extra>
          <status-tag :meta="noticeStatusMeta(notice.status)" />
        </template>

        <div class="detail">
          <div class="detail__meta">
            <span>通道：{{ notice.channelLabel || '站内信' }}</span>
            <span>时间：{{ formatDateTime(notice.sendTime ?? notice.createTime) }}</span>
          </div>
          <p class="detail__content">{{ notice.content || '（无正文）' }}</p>
        </div>
      </section-card>

      <page-empty v-else-if="!loading" description="未找到该通知，可能已被删除" />
    </n-spin>
  </page-container>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  font-size: 12.5px;
  color: var(--yuna-gray-600);
}

/* 超长通知在页面内自然换行、整页滚动，不做截断 */
.detail__content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--yuna-gray-800);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
