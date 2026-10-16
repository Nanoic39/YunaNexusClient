<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton } from 'naive-ui'
import { PageContainer, DataTable, formatDateTime } from '@yuna/ui'
import { authAdminApi } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const router = useRouter(),
  loading = ref(false),
  error = ref('')
const rows = ref<Awaited<ReturnType<typeof authAdminApi.resetRecords>>>([])
const labels: Record<string, string> = {
  EMAIL_VERIFIED_RESET: '邮箱验证后重置',
  USER_COMPLETED_RESET: '用户完成新密码设置',
  USER_CHANGED_PASSWORD: '用户主动修改密码',
}
const columns = [
  { title: '用户', key: 'username' },
  { title: '事件', key: 'event', render: (r: { event: string }) => labels[r.event] || r.event },
  {
    title: '时间',
    key: 'createTime',
    render: (r: { createTime: string }) => formatDateTime(r.createTime),
  },
]
async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await authAdminApi.resetRecords()
  } catch (e) {
    error.value = handleApiError(e, router)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
<template>
  <page-container
    title="密码重置记录"
    description="仅查看最近1000条审计事件，不保存或展示密码、验证码及重置凭证"
    ><template #extra><n-button :loading="loading" @click="load">刷新</n-button></template
    ><n-alert v-if="error" type="error">{{ error }}</n-alert
    ><data-table
      :data="rows"
      :columns="columns"
      :loading="loading"
      :row-key="(r) => r.id"
      :show-pagination="false"
  /></page-container>
</template>
