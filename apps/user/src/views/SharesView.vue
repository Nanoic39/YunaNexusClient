<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NTag, NAlert, NEmpty, NSpin, useDialog, useMessage } from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import { workspaceApi, shareUrl, copyText } from '@yuna/core'
import type { FileShare } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const router = useRouter(),
  message = useMessage(),
  dialog = useDialog(),
  rows = ref<FileShare[]>([]),
  loading = ref(false),
  error = ref(''),
  query = ref(''),
  busy = ref('')
const filtered = computed(() =>
  rows.value.filter((r) => r.fileName.toLowerCase().includes(query.value.toLowerCase())),
)
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
function state(s: FileShare) {
  return s.revoked ? '已撤销' : new Date(s.expiresAt).getTime() <= now.value ? '已过期' : '分享中'
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await workspaceApi.shares()
  } catch (e) {
    error.value = handleApiError(e, router)
  } finally {
    loading.value = false
  }
}
async function copy(s: FileShare) {
  try {
    await copyText(shareUrl(s.shareId))
    message.success('分享链接已复制；提取码请单独告知接收人')
  } catch (e) {
    message.error(String(e))
  }
}
function revoke(s: FileShare) {
  dialog.warning({
    title: '撤销分享',
    content: `撤销「${s.fileName}」的分享后，所有持有链接的人都无法继续下载。`,
    positiveText: '撤销分享',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = s.shareId
      try {
        await workspaceApi.revokeShare(s.shareId)
        await load()
        message.success('分享已撤销')
      } catch (e) {
        message.error(handleApiError(e, router))
      } finally {
        busy.value = ''
      }
    },
  })
}
onMounted(() => {
  void load()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 30000)
})
onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})
</script>
<template>
  <page-container title="我的分享" description="查看文件分享的有效期与访问保护，随时撤销链接"
    ><template #extra
      ><n-button :loading="loading" @click="load">刷新</n-button
      ><n-button type="primary" @click="router.push('/console/files')"
        >选择文件分享</n-button
      ></template
    >
    <div class="share-summary">
      <div>
        <strong>{{ rows.filter((s) => state(s) === '分享中').length }}</strong
        ><span>有效分享</span>
      </div>
      <div>
        <strong>{{ rows.filter((s) => s.protectedByCode).length }}</strong
        ><span>设置提取码</span>
      </div>
      <div>
        <strong>{{ rows.length }}</strong
        ><span>近期记录</span>
      </div>
    </div>
    <section-card
      title="分享记录"
      description="提取码以摘要保存，无法找回；忘记后请撤销并重新创建分享。"
      ><n-input
        v-model:value="query"
        clearable
        placeholder="搜索分享文件名"
        aria-label="搜索分享"
        style="max-width: 360px; margin-bottom: 20px" /><n-alert v-if="error" type="error">{{
        error
      }}</n-alert
      ><n-spin :show="loading"
        ><div class="share-list">
          <article v-for="s in filtered" :key="s.shareId" class="share-row">
            <div class="share-main">
              <h3>
                {{ s.fileName }}
                <n-tag size="small" :type="state(s) === '分享中' ? 'success' : 'default'">{{
                  state(s)
                }}</n-tag>
              </h3>
              <p>
                {{ s.protectedByCode ? '提取码保护' : '持有链接可访问' }} · 创建于
                {{ formatDateTime(s.createdAt) }}
              </p>
            </div>
            <div class="share-expiry">
              <small>到期时间</small><span>{{ formatDateTime(s.expiresAt) }}</span>
            </div>
            <div class="share-actions">
              <n-button size="small" :disabled="state(s) !== '分享中'" @click="copy(s)"
                >复制链接</n-button
              ><n-button
                size="small"
                type="error"
                secondary
                :disabled="s.revoked"
                :loading="busy === s.shareId"
                @click="revoke(s)"
                >撤销</n-button
              >
            </div>
          </article>
        </div>
        <n-empty
          v-if="!filtered.length && !error"
          description="暂无分享记录"
          style="padding: 48px 0" /></n-spin
    ></section-card>
  </page-container>
</template>
<style scoped>
.share-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.share-summary > div {
  background: var(--yuna-card-bg);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  border: var(--yuna-card-border);
}
.share-summary strong {
  font-size: 28px;
  font-weight: 600;
}
.share-summary span,
.share-row p,
.share-expiry small {
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.share-row {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--yuna-gray-100);
}
.share-main {
  flex: 1;
  min-width: 0;
}
.share-main h3 {
  font-size: 14px;
  overflow-wrap: anywhere;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.share-main p {
  margin-top: 8px;
}
.share-expiry {
  display: grid;
  gap: 5px;
  font-size: 12px;
}
.share-actions {
  display: flex;
  gap: 8px;
}
@media (max-width: 850px) {
  .share-row {
    flex-wrap: wrap;
    gap: 16px;
  }
  .share-main {
    flex-basis: 100%;
  }
  .share-expiry {
    flex: 1;
  }
  .share-summary > div {
    padding: 15px;
    display: grid;
    gap: 0;
  }
}
@media (max-width: 480px) {
  .share-summary {
    gap: 8px;
  }
  .share-summary strong {
    font-size: 23px;
  }
  .share-summary span {
    font-size: 11px;
  }
}
</style>
