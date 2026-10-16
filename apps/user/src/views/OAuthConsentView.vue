<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NSpin, NTag } from 'naive-ui'
import { PageContainer, SectionCard } from '@yuna/ui'
import { userHttp, toErrorMessage } from '@yuna/core'
const route = useRoute(),
  router = useRouter()
const loading = ref(true),
  busy = ref(false),
  error = ref('')
interface App {
  clientId: string
  appName: string
  description: string | null
  websiteUrl: string | null
  scopes: string[]
  redirectUri: string
}
const app = ref<App | null>(null)
const labels: Record<string, string> = {
  'profile:read': '查看你的基础身份和昵称',
  'email:read': '读取个人资料中的联系邮箱',
  'files:read': '列出、预览和下载你的文件',
  'files:write': '上传、重命名和删除你的文件',
  'notice:read': '阅读你的站内通知',
}
const request = computed(() => ({
  clientCode: String(route.query.client_id ?? ''),
  redirectUri: String(route.query.redirect_uri ?? ''),
  state: String(route.query.state ?? ''),
  codeChallenge: String(route.query.code_challenge ?? ''),
  codeChallengeMethod: String(route.query.code_challenge_method ?? ''),
}))
function valid() {
  const r = request.value
  return (
    /^oauth_[A-Za-z0-9_-]{43}$/.test(r.clientCode) &&
    /^[A-Za-z0-9._~-]{43,256}$/.test(r.state) &&
    /^[A-Za-z0-9_-]{43}$/.test(r.codeChallenge) &&
    r.codeChallengeMethod === 'S256'
  )
}
async function load() {
  loading.value = true
  error.value = ''
  app.value = null
  try {
    if (!valid()) throw new Error('授权参数无效，请从接入应用重新发起登录')
    app.value = await userHttp.request<App>('/api/v1/auth/account/oauth-consent', {
      query: { clientCode: request.value.clientCode, redirectUri: request.value.redirectUri },
    })
  } catch (e) {
    error.value = toErrorMessage(e)
  } finally {
    loading.value = false
  }
}
async function approve() {
  if (busy.value || !app.value || !valid()) return
  busy.value = true
  error.value = ''
  try {
    const result = await userHttp.request<{ redirectUrl: string }>(
      '/api/v1/auth/account/oauth-consent',
      { method: 'POST', body: request.value },
    )
    const url = new URL(result.redirectUrl),
      expected = new URL(app.value.redirectUri)
    if (
      url.origin !== expected.origin ||
      url.pathname !== expected.pathname ||
      url.searchParams.get('state') !== request.value.state ||
      !url.searchParams.get('code')
    )
      throw new Error('授权回调校验失败')
    window.location.assign(url.toString())
  } catch (e) {
    error.value = toErrorMessage(e)
    busy.value = false
  }
}
function cancel() {
  if (busy.value) return
  if (app.value && valid()) {
    const url = new URL(app.value.redirectUri)
    url.searchParams.set('error', 'access_denied')
    url.searchParams.set('state', request.value.state)
    window.location.assign(url.toString())
    return
  }
  void router.replace('/console/applications')
}

onMounted(load)
</script>
<template>
  <page-container title="应用授权" description="请确认应用身份与访问范围，再决定是否授权">
    <section-card class="consent-card">
      <n-spin :show="loading">
        <n-alert v-if="error" type="error" role="alert"
          >{{ error }} <n-button v-if="!busy" text @click="load">重试</n-button></n-alert
        >
        <template v-if="app">
          <div class="consent-app">
            <n-tag type="info">外部应用</n-tag>
            <h2>{{ app.appName }}</h2>
            <p v-if="app.description">{{ app.description }}</p>
            <p v-if="app.websiteUrl" class="muted">应用网站：{{ app.websiteUrl }}</p>
          </div>
          <h3>该应用将获得以下权限</h3>
          <ul class="consent-scopes">
            <li v-for="scope in app.scopes" :key="scope">
              <strong>{{ labels[scope] || scope }}</strong
              ><code>{{ scope }}</code>
            </li>
          </ul>
          <p class="muted">授权后返回：{{ app.redirectUri }}</p>
          <n-alert type="info"
            >授权不会向应用提供你的密码，也不会授予管理权限。你可在“已授权应用”中撤销访问；删除文件等写操作可能无法恢复。</n-alert
          >
        </template>
        <div class="consent-actions">
          <n-button :disabled="busy" @click="cancel">拒绝授权</n-button
          ><n-button
            type="primary"
            :loading="busy"
            :disabled="loading || !app || !!error"
            @click="approve"
            >同意并继续</n-button
          >
        </div>
      </n-spin>
    </section-card>
  </page-container>
</template>
<style scoped>
.consent-card {
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}
.consent-app {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
}
.consent-app h2 {
  font-size: 24px;
  margin: 0;
}
.consent-scopes {
  list-style: none;
  padding: 0;
  margin: 16px 0 24px;
  display: grid;
  gap: 12px;
}
.consent-scopes li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 14px;
  background: var(--yuna-gray-50);
  border-radius: 8px;
}
.consent-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.muted {
  font-size: 13px;
  color: var(--yuna-gray-600);
  overflow-wrap: anywhere;
  margin-bottom: 16px;
}
</style>
