<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { NAlert, NButton, NEmpty, NIcon, NSpin } from 'naive-ui'
import {
  FolderOpenOutline,
  ShieldCheckmarkOutline,
  MailOutline,
  PersonOutline,
  KeyOutline,
  GiftOutline,
} from '@vicons/ionicons5'
import { PageContainer, SectionCard, formatRelative } from '@yuna/ui'
import { authApi, noticeApi, noticeRevision, session } from '@yuna/core'
import type { IdentityResult, NoticeRecordView } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const identity = ref<IdentityResult | null>(null)
const notices = ref<NoticeRecordView[]>([])
const summary = ref<{ total: number; unread: number } | null>(null)
const tasks = [
  { name: '我的文件', desc: '上传、下载与分享', path: 'files', icon: FolderOpenOutline },
  { name: '站内信', desc: '查看通知与安全提醒', path: 'messages', icon: MailOutline },
  { name: '积分与签到', desc: '领取每日积分、查看明细', path: 'points', icon: GiftOutline },
  { name: '个人资料', desc: '编辑头像与联系信息', path: 'profile', icon: PersonOutline },
  {
    name: '已授权应用',
    desc: '检查与撤销应用访问',
    path: 'applications',
    icon: ShieldCheckmarkOutline,
  },
  { name: '个人 API Key', desc: '管理脚本访问密钥', path: 'api-keys', icon: KeyOutline },
]
let alive = true
let generation = 0
let controller: AbortController | undefined
async function load(): Promise<void> {
  const version = ++generation
  const account = session.state.externalId
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  error.value = ''
  try {
    const [me, inbox, counts] = await Promise.all([
      authApi.me(),
      noticeApi.inbox({ page: 1, size: 4 }, signal),
      noticeApi.summary(signal),
    ])
    if (!alive || version !== generation || account !== session.state.externalId) return
    identity.value = me
    notices.value = inbox.records
    summary.value = counts
  } catch (cause) {
    if (alive && version === generation && !signal.aborted)
      error.value = handleApiError(cause, router)
  } finally {
    if (alive && version === generation) loading.value = false
  }
}
watch(noticeRevision, () => {
  void load()
})
watch(
  () => session.state.externalId,
  () => {
    identity.value = null
    notices.value = []
    summary.value = null
    if (session.state.accessToken) void load()
    else {
      generation++
      controller?.abort()
      loading.value = false
    }
  },
)
onMounted(load)
onBeforeUnmount(() => {
  alive = false
  generation++
  controller?.abort()
})
</script>

<template>
  <page-container title="概览" description="从常用任务开始，查看账号与最近通知。">
    <template #extra><n-button :loading="loading" @click="load">刷新</n-button></template>
    <n-alert v-if="error" type="error" role="alert"
      >{{ error }} <n-button text @click="load">重试</n-button></n-alert
    >
    <section-card title="常用任务">
      <div class="workspace-links">
        <router-link v-for="item in tasks" :key="item.path" :to="'/console/' + item.path">
          <n-icon :size="22"><component :is="item.icon" /></n-icon>
          <span
            ><strong>{{ item.name }}</strong
            ><small>{{ item.desc }}</small></span
          ><span class="task-arrow" aria-hidden="true">→</span>
        </router-link>
      </div>
    </section-card>
    <div class="overview-layout">
      <section-card title="最近通知" description="按接收时间显示最近 4 条">
        <template #extra
          ><router-link to="/console/messages"
            >全部通知<span v-if="summary?.unread"> · {{ summary.unread }} 条未读</span>
            →</router-link
          ></template
        >
        <n-spin :show="loading">
          <n-empty
            v-if="!notices.length && !loading && !error"
            description="暂无通知"
            class="notice-empty"
          />
          <ul v-else class="recent-notices">
            <li v-for="item in notices" :key="item.id">
              <router-link
                :to="{ name: 'message-detail', params: { noticeId: String(item.noticeId) } }"
                ><span class="notice-title"
                  ><span v-if="item.status === 1" class="unread-dot" aria-label="未读" />{{
                    item.title || '（无标题）'
                  }}</span
                ><time>{{ formatRelative(item.createTime) }}</time></router-link
              >
            </li>
          </ul>
        </n-spin>
      </section-card>
      <section-card title="当前账号">
        <dl class="account-facts">
          <div>
            <dt>昵称</dt>
            <dd>{{ identity?.nickname || '—' }}</dd>
          </div>
          <div>
            <dt>登录应用</dt>
            <dd>{{ identity?.clientCode || '—' }}</dd>
          </div>
          <div>
            <dt>站内信</dt>
            <dd>{{ summary ? `${summary.total} 条 · ${summary.unread} 条未读` : '—' }}</dd>
          </div>
        </dl>
        <router-link class="account-settings" to="/console/settings">管理账号安全 →</router-link>
      </section-card>
    </div>
  </page-container>
</template>

<style scoped>
.overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(240px, 1fr);
  gap: 16px;
  align-items: start;
}
.workspace-links {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.workspace-links a {
  border: 1px solid var(--yuna-gray-200);
  border-radius: 6px;
  padding: 15px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--yuna-gray-900);
}
.workspace-links a:hover {
  border-color: var(--yuna-gray-300);
  background: var(--yuna-gray-50);
}
.workspace-links a:focus-visible,
.recent-notices a:focus-visible {
  outline: 2px solid var(--yuna-primary);
  outline-offset: 2px;
}
.workspace-links .n-icon {
  color: var(--yuna-gray-700);
  flex-shrink: 0;
}
.workspace-links a > span:first-of-type {
  min-width: 0;
  flex: 1;
}
.workspace-links strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
}
.workspace-links small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--yuna-gray-700);
  line-height: 1.5;
}
.task-arrow {
  color: var(--yuna-gray-600);
}
.recent-notices {
  list-style: none;
  margin: 0;
  padding: 0;
}
.recent-notices li + li {
  border-top: 1px solid var(--yuna-gray-200);
}
.recent-notices a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 13px 0;
  color: var(--yuna-gray-900);
}
.recent-notices a:hover .notice-title {
  color: var(--yuna-primary);
}
.notice-title {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.recent-notices time {
  font-size: 12px;
  color: var(--yuna-gray-700);
  flex-shrink: 0;
}
.unread-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--yuna-primary);
  margin-right: 8px;
  vertical-align: middle;
}
.notice-empty {
  padding: 24px 0;
}
.account-facts {
  margin: 0;
  font-size: 13px;
}
.account-facts > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}
.account-facts dt {
  color: var(--yuna-gray-700);
}
.account-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}
.account-settings {
  display: inline-block;
  font-size: 12px;
  margin-top: 12px;
}
@media (max-width: 1100px) {
  .workspace-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 850px) {
  .overview-layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 550px) {
  .workspace-links {
    grid-template-columns: 1fr;
  }
  .recent-notices a {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
