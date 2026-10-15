<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDescriptions, NDescriptionsItem, useDialog, useMessage } from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import { authApi, session } from '@yuna/core'
import type { IdentityResult } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(true)
const submitting = ref(false)
const identity = ref<IdentityResult | null>(null)

const nickname = computed(() => session.state.nickname ?? identity.value?.nickname ?? null)
const clientCode = computed(() => session.state.clientCode ?? identity.value?.clientCode ?? null)
const expiresAt = computed(() => session.state.expiresAt)

async function load(): Promise<void> {
  loading.value = true
  try {
    identity.value = await authApi.me()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    loading.value = false
  }
}

async function logout(): Promise<void> {
  submitting.value = true
  try {
    await authApi.logout()
  } catch {
    /* 服务端登出失败不阻塞本地会话清理 */
  }
  session.clearUser()
  message.success('已退出登录')
  submitting.value = false
  void router.replace({ name: 'login' })
}

function logoutAll(): void {
  dialog.warning({
    title: '全局登出',
    content: '将撤销该账号的全部会话，其他设备上的登录也会失效。确认继续？',
    positiveText: '确认登出',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await authApi.logoutAll()
        session.clearUser()
        message.success('已在所有设备退出登录')
        void router.replace({ name: 'login' })
      } catch (error) {
        message.error(handleApiError(error, router))
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <page-container title="个人中心" description="查看当前登录身份与会话状态">
    <section-card title="账号信息">
      <n-descriptions :column="2" label-placement="left" :label-width="120">
        <n-descriptions-item label="昵称">
          {{ nickname || '—' }}
        </n-descriptions-item>
        <n-descriptions-item label="客户端">
          {{ clientCode || '—' }}
        </n-descriptions-item>
        <n-descriptions-item label="会话到期">
          {{ expiresAt ? formatDateTime(expiresAt) : '—' }}
        </n-descriptions-item>
        <n-descriptions-item label="登录状态">
          {{ loading ? '加载中…' : '已登录' }}
        </n-descriptions-item>
      </n-descriptions>
    </section-card>

    <section-card
      title="会话管理"
      description="退出当前会话，或撤销该账号在所有设备上的登录"
    >
      <div class="actions">
        <n-button :loading="submitting" @click="logout">退出登录</n-button>
        <n-button type="warning" secondary @click="logoutAll">全局登出</n-button>
      </div>
    </section-card>
  </page-container>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 12px;
}
</style>
