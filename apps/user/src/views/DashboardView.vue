<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, useMessage } from 'naive-ui'
import {
  MetricCard,
  PageContainer,
  SectionCard,
} from '@yuna/ui'
import { authApi, noticeApi } from '@yuna/core'
import type { IdentityResult, NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()

const loading = ref(true)
const identity = ref<IdentityResult | null>(null)
const notices = ref<NoticeRecordView[]>([])

const unreadCount = computed(() => notices.value.filter((item) => item.status === 1).length)
const readCount = computed(() => notices.value.filter((item) => item.status === 3).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [me, inbox] = await Promise.all([authApi.me(), noticeApi.inbox()])
    identity.value = me
    notices.value = inbox.records
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <page-container title="概览" description="查看账号信息与消息统计">
    <template #extra>
      <n-button quaternary :loading="loading" @click="load">刷新</n-button>
    </template>

    <div class="yuna-metric-grid">
      <metric-card label="未读消息" :value="unreadCount" unit="条" :loading="loading" />
      <metric-card label="已读消息" :value="readCount" unit="条" :loading="loading" />
      <metric-card label="消息总数" :value="notices.length" unit="条" :loading="loading" />
    </div>

    <section-card title="账号信息" description="当前登录身份">
      <div class="yuna-cell-grid">
        <div class="yuna-cell">
          <span class="yuna-cell__sub">昵称</span>
          <span>{{ identity?.nickname ?? '—' }}</span>
        </div>
        <div class="yuna-cell">
          <span class="yuna-cell__sub">客户端</span>
          <span>{{ identity?.clientCode ?? '—' }}</span>
        </div>
      </div>
    </section-card>
  </page-container>
</template>
