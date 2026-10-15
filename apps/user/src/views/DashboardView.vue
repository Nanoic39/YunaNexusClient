<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, useMessage } from 'naive-ui'
import { MetricCard, PageContainer, SectionCard } from '@yuna/ui'
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

    <div class="overview-layout">
      <section-card title="工作空间" description="常用功能，一步直达"
        ><div class="workspace-links">
          <button
            v-for="item in [
              { name: '个人资料', desc: '头像、联系信息与标签', path: 'profile' },
              { name: '我的文件', desc: '上传、预览与安全分享', path: 'files' },
              { name: '应用授权', desc: '查看与撤销已授权应用', path: 'applications' },
              { name: '个人 API Key', desc: '为个人脚本配置访问权限', path: 'api-keys' },
            ]"
            :key="item.path"
            @click="router.push('/console/' + item.path)"
          >
            <strong>{{ item.name }} <span>↗</span></strong
            ><small>{{ item.desc }}</small>
          </button>
        </div></section-card
      >
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
    </div>
  </page-container>
</template>

<style scoped>
.overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
  gap: 20px;
  align-items: start;
}
.workspace-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.workspace-links button {
  border: 1px solid var(--yuna-gray-100);
  border-radius: 10px;
  background: var(--yuna-gray-50);
  padding: 18px;
  text-align: left;
  cursor: pointer;
  color: var(--yuna-gray-900);
}
.workspace-links button:hover {
  border-color: var(--yuna-gray-300);
  background: var(--yuna-gray-100);
}
.workspace-links strong {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
.workspace-links small {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--yuna-gray-600);
}
@media (max-width: 1000px) {
  .overview-layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 500px) {
  .workspace-links {
    grid-template-columns: 1fr;
  }
}
</style>
