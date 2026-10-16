<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  NAlert,
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSpin,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { PageContainer, SectionCard, StatusTag, formatDateTime, oauthAppStatusMeta } from '@yuna/ui'
import { oauthAppApi, oauthAppRegistrationEnabled, copyText, session } from '@yuna/core'
import { OAUTH_SCOPE_LABELS, OAUTH_SCOPE_OPTIONS } from '@yuna/core'
import type { OAuthApplicationView, OAuthAppSavePayload } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const apps = ref<OAuthApplicationView[]>([])
const loading = ref(false)
const error = ref('')
const busy = ref<number | null>(null)

const scopeOptions = OAUTH_SCOPE_OPTIONS
const scopeNames = OAUTH_SCOPE_LABELS

let generation = 0
let alive = true

async function load(): Promise<void> {
  if (!oauthAppRegistrationEnabled) return
  const version = ++generation
  loading.value = true
  error.value = ''
  try {
    const result = await oauthAppApi.mine()
    if (version === generation) apps.value = result
  } catch (e) {
    if (version === generation) error.value = handleApiError(e, router)
  } finally {
    if (version === generation) loading.value = false
  }
}

function canEdit(app: OAuthApplicationView): boolean {
  return app.status !== 3
}
function canResetSecret(app: OAuthApplicationView): boolean {
  return app.status === 1
}

/* ------------------------------ 申请 / 修改 ------------------------------ */

const modalVisible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)
const form = reactive({
  appName: '',
  description: '',
  websiteUrl: '',
  redirectUrisText: '',
  scopes: ['profile:read'] as string[],
})
const rules: FormRules = {
  appName: [{ required: true, message: '请输入应用名称', trigger: ['input', 'blur'] }],
}
const modalTitle = computed(() => (editingId.value === null ? '申请接入应用' : '修改接入应用'))

function resetForm(): void {
  form.appName = ''
  form.description = ''
  form.websiteUrl = ''
  form.redirectUrisText = ''
  form.scopes = ['profile:read']
}

function parseRedirectUris(): string[] {
  return form.redirectUrisText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function openCreate(): void {
  if (!oauthAppRegistrationEnabled || loading.value || error.value) return
  editingId.value = null
  resetForm()
  modalVisible.value = true
}

function openEdit(app: OAuthApplicationView): void {
  editingId.value = app.id
  form.appName = app.appName
  form.description = app.description ?? ''
  form.websiteUrl = app.websiteUrl ?? ''
  form.redirectUrisText = app.redirectUris.join('\n')
  form.scopes = [...app.scopes]
  modalVisible.value = true
}

async function submit(): Promise<void> {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  const redirectUris = parseRedirectUris()
  if (!redirectUris.length) {
    message.warning('请至少填写一个回调地址')
    return
  }
  const invalid = redirectUris.find((uri) => {
    try {
      const url = new URL(uri)
      return url.protocol !== 'https:' && url.protocol !== 'http:'
    } catch {
      return true
    }
  })
  if (invalid) {
    message.warning(`回调地址无效：${invalid}`)
    return
  }
  if (!form.scopes.length) {
    message.warning('请至少选择一项权限范围')
    return
  }
  const payload: OAuthAppSavePayload = {
    appName: form.appName.trim(),
    description: form.description.trim() || undefined,
    websiteUrl: form.websiteUrl.trim() || undefined,
    redirectUris,
    scopes: [...form.scopes],
  }
  saving.value = true
  const account = session.state.externalId
  try {
    const isCreate = editingId.value === null
    const result = isCreate
      ? await oauthAppApi.create(payload)
      : await oauthAppApi.update(editingId.value as number, payload)
    if (!alive || account !== session.state.externalId) return
    modalVisible.value = false
    await load()
    if (result.clientSecret) showSecret(result)
    else message.success(isCreate ? '已提交申请，等待审核' : '已更新，等待审核')
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    saving.value = false
  }
}

/* ------------------------------ 密钥展示（仅一次） ------------------------------ */

const secretVisible = ref(false)
const secretAppName = ref('')
const secretValue = ref('')
const saved = ref(false)

function showSecret(app: OAuthApplicationView): void {
  if (!app.clientSecret) return
  secretAppName.value = app.appName
  secretValue.value = app.clientSecret
  saved.value = false
  secretVisible.value = true
}

function closeSecret(): void {
  if (secretValue.value && !saved.value) {
    message.warning('请先保存并确认密钥；关闭后无法再次查看完整密钥')
    return
  }
  secretVisible.value = false
  secretValue.value = ''
  saved.value = false
}

async function copySecret(): Promise<void> {
  try {
    await copyText(secretValue.value)
    message.success('密钥已复制，请妥善保存')
  } catch (e) {
    message.error(String(e))
  }
}

async function resetSecret(app: OAuthApplicationView): Promise<void> {
  busy.value = app.id
  try {
    const result = await oauthAppApi.resetSecret(app.id)
    await load()
    showSecret(result)
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    busy.value = null
  }
}

function confirmReset(app: OAuthApplicationView): void {
  dialog.warning({
    title: '重置客户端密钥',
    content: `重置后「${app.appName}」的旧密钥立即失效，使用旧密钥的接入将中断。`,
    positiveText: '重置密钥',
    negativeText: '取消',
    onPositiveClick: () => resetSecret(app),
  })
}

function confirmRemove(app: OAuthApplicationView): void {
  dialog.warning({
    title: '撤回接入应用',
    content: `确认撤回并删除「${app.appName}」？已签发的客户端凭证将失效，此操作无法恢复。`,
    positiveText: '撤回',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = app.id
      try {
        await oauthAppApi.remove(app.id)
        await load()
        message.success('应用已撤回')
      } catch (e) {
        message.error(handleApiError(e, router))
      } finally {
        busy.value = null
      }
    },
  })
}

/* ------------------------------ 生命周期 ------------------------------ */

function needsProtection(): boolean {
  return saving.value || Boolean(secretVisible.value && secretValue.value && !saved.value)
}
function protectUnload(event: BeforeUnloadEvent): void {
  if (needsProtection()) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (saving.value) {
    message.warning('申请正在提交，请稍候')
    return false
  }
  if (!(secretVisible.value && secretValue.value && !saved.value)) return true
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '完整密钥尚未保存',
      content: '离开后无法再次查看完整密钥。请先保存，或明确放弃本次展示。',
      positiveText: '留下保存',
      negativeText: '放弃并离开',
      onPositiveClick: () => resolve(false),
      onNegativeClick: () => resolve(true),
      onClose: () => resolve(false),
      onEsc: () => resolve(false),
      onMaskClick: () => resolve(false),
    })
  })
})

onMounted(() => {
  void load()
  window.addEventListener('beforeunload', protectUnload)
})
onBeforeUnmount(() => {
  alive = false
  generation++
  secretValue.value = ''
  window.removeEventListener('beforeunload', protectUnload)
})
</script>

<template>
  <page-container
    title="应用接入"
    description="申请自定义 OAuth 应用，接入 YunaNexus 统一登录与授权"
  >
    <template #extra>
      <n-button :loading="loading" :disabled="!oauthAppRegistrationEnabled" @click="load"
        >刷新</n-button
      >
      <n-button
        type="primary"
        :disabled="!oauthAppRegistrationEnabled || loading || !!error"
        @click="openCreate"
        >申请接入</n-button
      >
    </template>

    <div class="oauth-layout">
      <div class="oauth-main">
        <section-card
          title="我的接入应用"
          :description="
            !oauthAppRegistrationEnabled
              ? '暂未开放'
              : loading
                ? '正在加载'
                : error
                  ? '加载失败'
                  : `共 ${apps.length} 个应用`
          "
        >
          <n-alert v-if="!oauthAppRegistrationEnabled" type="info" title="接入申请暂未开放">
            自定义 OAuth
            应用的申请与审核服务尚未开放。已有账号的平台授权可在「已授权应用」中查看和撤销。
            <p>
              <n-button text type="primary" @click="router.push('/console/applications')"
                >查看已授权应用</n-button
              >
            </p>
          </n-alert>
          <n-alert v-else-if="error" type="error">
            {{ error }}<n-button text @click="load">重试</n-button>
          </n-alert>
          <n-spin :show="loading">
            <article v-for="app in apps" :key="app.id" class="oauth-row">
              <div class="oauth-icon">{{ app.appName.slice(0, 1) }}</div>
              <div class="oauth-data">
                <h3>
                  {{ app.appName }}
                  <status-tag :meta="oauthAppStatusMeta(app.status)" />
                </h3>
                <p v-if="app.description">{{ app.description }}</p>
                <p class="oauth-meta">
                  Client ID：<code>{{ app.clientId || '审核通过后分配' }}</code>
                </p>
                <div class="oauth-scopes">
                  <n-tag v-for="s in app.scopes" :key="s" size="small" :bordered="false">
                    {{ scopeNames[s] || s }}
                  </n-tag>
                </div>
                <p class="oauth-uri">回调：{{ app.redirectUris.join('、') }}</p>
                <n-alert
                  v-if="app.status === 2 && app.auditRemark"
                  type="error"
                  :bordered="false"
                  style="margin-top: 10px"
                >
                  驳回原因：{{ app.auditRemark }}
                </n-alert>
                <div class="oauth-dates">
                  <span>提交 {{ formatDateTime(app.createTime) }}</span>
                  <span v-if="app.auditTime">审核 {{ formatDateTime(app.auditTime) }}</span>
                </div>
              </div>
              <div class="oauth-actions">
                <n-button
                  v-if="canEdit(app)"
                  size="small"
                  secondary
                  :loading="busy === app.id"
                  @click="openEdit(app)"
                >
                  修改
                </n-button>
                <n-button
                  v-if="canResetSecret(app)"
                  size="small"
                  secondary
                  :loading="busy === app.id"
                  @click="confirmReset(app)"
                >
                  重置密钥
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  secondary
                  :loading="busy === app.id"
                  @click="confirmRemove(app)"
                >
                  撤回
                </n-button>
              </div>
            </article>
            <n-empty
              v-if="oauthAppRegistrationEnabled && !loading && !apps.length && !error"
              description="尚未申请任何接入应用"
              class="oauth-empty"
            />
          </n-spin>
        </section-card>
      </div>

      <aside v-if="oauthAppRegistrationEnabled" class="oauth-aside">
        <section-card title="接入流程">
          <p>1. 提交应用名称、回调地址与所需权限范围，进入待审核。</p>
          <p>2. 管理员审核通过后，系统分配 Client ID 与密钥。</p>
          <p>3. 使用授权码流程（authorize → token）换取访问令牌。</p>
        </section-card>
        <section-card title="安全提示">
          <p>密钥仅在创建或重置时展示一次，请妥善保存，不要提交到公开仓库。</p>
          <p>回调地址需与实际使用一致，精确匹配才可完成授权。</p>
        </section-card>
      </aside>
    </div>

    <!-- 申请 / 修改 -->
    <n-modal
      v-model:show="modalVisible"
      preset="card"
      :title="modalTitle"
      style="width: 560px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
    >
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-placement="top"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="应用名称" path="appName">
          <n-input v-model:value="form.appName" maxlength="64" placeholder="如 数据看板助手" />
        </n-form-item>
        <n-form-item label="应用描述">
          <n-input
            v-model:value="form.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="选填，简要说明应用用途"
          />
        </n-form-item>
        <n-form-item label="应用主页">
          <n-input v-model:value="form.websiteUrl" placeholder="选填，如 https://example.com" />
        </n-form-item>
        <n-form-item label="回调地址">
          <n-input
            v-model:value="form.redirectUrisText"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            placeholder="每行一个，如 https://example.com/oauth/callback"
          />
        </n-form-item>
        <n-form-item label="权限范围">
          <n-checkbox-group v-model:value="form.scopes">
            <div class="scope-options">
              <n-checkbox v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </n-checkbox>
            </div>
          </n-checkbox-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="submit">提交申请</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 密钥展示（仅一次） -->
    <n-modal
      :show="secretVisible"
      preset="card"
      title="客户端密钥"
      style="width: 560px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
      :close-on-esc="false"
      @update:show="
        (value) => {
          if (!value) closeSecret()
        }
      "
    >
      <n-alert type="warning" title="完整密钥仅展示这一次">
        「{{ secretAppName }}」的密钥请立即保存，后端仅保存摘要，遗失后请重置。
      </n-alert>
      <n-input
        :value="secretValue"
        readonly
        type="textarea"
        aria-label="客户端密钥"
        style="margin: 20px 0; font-family: monospace"
      />
      <n-button @click="copySecret">复制密钥</n-button>
      <div style="margin: 24px 0">
        <n-checkbox v-model:checked="saved">我已保存密钥，了解关闭后无法再次查看</n-checkbox>
      </div>
      <n-button block type="primary" :disabled="!saved" @click="closeSecret">完成</n-button>
    </n-modal>
  </page-container>
</template>

<style scoped>
.oauth-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 20px;
  align-items: start;
}
.oauth-aside {
  display: grid;
  gap: 18px;
}
.oauth-aside p {
  font-size: 12px;
  line-height: 1.9;
  color: var(--yuna-gray-600);
  margin-bottom: 14px;
}
.oauth-row {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  border-bottom: 1px solid var(--yuna-gray-100);
  padding: 22px 0;
}
.oauth-row:first-child {
  padding-top: 0;
}
.oauth-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.oauth-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--yuna-gray-100);
  color: var(--yuna-gray-600);
  display: grid;
  place-items: center;
  font-size: 21px;
  font-weight: 700;
  flex-shrink: 0;
}
.oauth-data {
  flex: 1;
  min-width: 0;
}
.oauth-data h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
  flex-wrap: wrap;
}
.oauth-data p {
  font-size: 12px;
  color: var(--yuna-gray-600);
  margin: 5px 0;
  overflow-wrap: anywhere;
}
.oauth-data code {
  font-size: 12px;
  color: var(--yuna-gray-700);
}
.oauth-scopes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.oauth-uri {
  word-break: break-all;
}
.oauth-dates {
  display: flex;
  gap: 8px 24px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--yuna-gray-600);
  margin-top: 12px;
}
.oauth-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.scope-options {
  display: grid;
  gap: 14px;
}
.oauth-empty {
  padding: 50px 0;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
@media (max-width: 1150px) {
  .oauth-layout {
    grid-template-columns: 1fr;
  }
  .oauth-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .oauth-aside {
    grid-template-columns: 1fr;
  }
  .oauth-row {
    gap: 10px;
    flex-wrap: wrap;
  }
  .oauth-actions {
    flex-direction: row;
  }
}
</style>
