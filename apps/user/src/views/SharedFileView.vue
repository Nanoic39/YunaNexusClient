<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NInput, NAlert, NForm, NFormItem } from 'naive-ui'
import { workspaceApi, saveBlob, formatBytes, toErrorMessage } from '@yuna/core'
const id = new URLSearchParams(location.hash.slice(1)).get('id') ?? '',
  code = ref(''),
  loading = ref(false),
  error = ref(''),
  info = ref<{ fileName: string; size: number }>()
async function verify() {
  loading.value = true
  error.value = ''
  try {
    info.value = await workspaceApi.shareInfo(id, code.value)
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}
async function download() {
  loading.value = true
  error.value = ''
  try {
    const blob = await workspaceApi.sharedDownload(id, code.value)
    saveBlob(blob, info.value?.fileName ?? 'download')
  } catch (e) {
    info.value = undefined
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <main class="shared-page">
    <a href="/" class="share-brand">YunaNexus</a>
    <section class="shared-card">
      <span class="share-eyebrow">FILE SHARING</span>
      <h1>有人与你分享了文件</h1>
      <p>链接可能设有提取码或有效期，请向分享人确认。</p>
      <n-alert v-if="error" type="error" style="margin: 20px 0">{{ error }}</n-alert
      ><template v-if="info"
        ><h2>{{ info.fileName }}</h2>
        <p>{{ formatBytes(info.size) }}</p>
        <n-button block type="primary" :loading="loading" @click="download"
          >下载文件</n-button
        ></template
      ><n-form v-else @submit.prevent="verify"
        ><n-form-item label="提取码"
          ><n-input
            v-model:value="code"
            type="password"
            show-password-on="click"
            maxlength="32"
            placeholder="未设置提取码可直接查看"
            aria-label="提取码" /></n-form-item
        ><n-button block type="primary" attr-type="submit" :loading="loading" :disabled="!id"
          >查看分享文件</n-button
        ></n-form
      >
    </section>
    <small>仅在文件分享有效且文件未删除时可下载</small>
  </main>
</template>
<style scoped>
.shared-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
  gap: 24px;
  background: var(--yuna-gray-50);
}
.share-brand {
  font-size: 21px;
  font-weight: 700;
  color: var(--yuna-gray-900);
  text-decoration: none;
}
.shared-card {
  width: 100%;
  max-width: 480px;
  background: var(--yuna-card-bg);
  padding: 36px;
  border-radius: 20px;
  box-shadow: var(--yuna-card-shadow);
  border: var(--yuna-card-border);
}
.share-eyebrow {
  letter-spacing: 2px;
  font-size: 10px;
  color: var(--yuna-gray-600);
}
.shared-card h1 {
  font-size: 23px;
  margin: 14px 0 10px;
}
.shared-card p {
  font-size: 13px;
  color: var(--yuna-gray-600);
  line-height: 1.8;
  margin-bottom: 24px;
}
.shared-card h2 {
  font-size: 18px;
  margin: 24px 0 8px;
  overflow-wrap: anywhere;
}
.shared-page > small {
  color: var(--yuna-gray-600);
  font-size: 11px;
}
@media (max-width: 500px) {
  .shared-page {
    padding: 20px;
  }
  .shared-card {
    padding: 24px;
  }
}
</style>
