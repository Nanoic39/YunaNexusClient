<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NSpin } from 'naive-ui'
import {
  PageContainer,
  PageEmpty,
  SectionCard,
  StatusTag,
  formatDateTime,
  noticeStatusMeta,
} from '@yuna/ui'
import { noticeApi, session } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const route = useRoute(),
  router = useRouter(),
  loading = ref(true),
  notice = ref<NoticeRecordView | null>(null),
  error = ref(''),
  readError = ref(''),
  reading = ref(false)
const noticeId = computed(() => Number(route.params.noticeId))
const identity = () => `${session.state.externalId}|${session.state.clientCode}`
let alive = true,
  generation = 0,
  controller: AbortController | undefined
async function markRead() {
  const current = notice.value,
    version = generation,
    account = identity()
  if (!current || current.status === 3 || reading.value) return
  reading.value = true
  readError.value = ''
  try {
    await noticeApi.markRead(current.noticeId)
    if (alive && version === generation && account === identity()) current.status = 3
  } catch (cause) {
    if (alive && version === generation && account === identity())
      readError.value = handleApiError(cause, router)
  } finally {
    if (alive && version === generation) reading.value = false
  }
}
async function load() {
  const id = noticeId.value,
    version = ++generation,
    account = identity()
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  notice.value = null
  error.value = ''
  readError.value = ''
  reading.value = false
  loading.value = true
  if (!Number.isSafeInteger(id) || id <= 0) {
    error.value = '通知编号无效'
    loading.value = false
    return
  }
  try {
    const result = await noticeApi.detail(id, signal)
    if (!alive || version !== generation || account !== identity()) return
    notice.value = result
    await markRead()
  } catch (cause) {
    if (alive && version === generation && account === identity() && !signal.aborted)
      error.value = handleApiError(cause, router)
  } finally {
    if (alive && version === generation) loading.value = false
  }
}
watch(
  [noticeId, identity],
  () => {
    if (session.state.accessToken) void load()
    else {
      ++generation
      controller?.abort()
      notice.value = null
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  alive = false
  ++generation
  controller?.abort()
})
</script>

<template>
  <page-container title="通知详情" description="完整查看单条站内通知">
    <template #extra>
      <n-button quaternary @click="router.back()">返回</n-button>
    </template>

    <n-alert v-if="error" type="error" role="alert"
      >{{ error }} <n-button text @click="load">重试</n-button></n-alert
    >
    <n-alert v-if="readError" type="warning"
      >通知正文已加载，但未能标记已读：{{ readError }}
      <n-button text :loading="reading" @click="markRead">重试标记已读</n-button></n-alert
    >
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

      <page-empty v-else-if="!loading && !error" description="未找到该通知，可能已被删除" />
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
