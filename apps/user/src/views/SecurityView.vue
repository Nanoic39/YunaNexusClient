<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, reactive } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  NButton,
  NAlert,
  NTag,
  NEmpty,
  NSpin,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NCheckbox,
  NCheckboxGroup,
  useMessage,
  useDialog,
} from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import { workspaceApi, copyText, session } from '@yuna/core'
import type { ApplicationGrant, PersonalApiKey } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const route = useRoute(),
  router = useRouter(),
  message = useMessage(),
  dialog = useDialog()
const isKeys = computed(() => route.path.endsWith('api-keys')),
  loading = ref(false),
  error = ref(''),
  busy = ref(''),
  grants = ref<ApplicationGrant[]>([]),
  keys = ref<PersonalApiKey[]>([])
const creating = ref(false),
  modal = ref(false),
  secret = ref(''),
  saved = ref(false),
  form = reactive({ name: '', scopes: ['profile:read'], days: 30 })
const scopeNames: Record<string, string> = {
  'profile:read': '读取个人资料',
  'files:read': '查看与下载本人文件',
  'files:write': '上传、重命名与删除本人文件',
}
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined,
  alive = true
const status = (key: PersonalApiKey) =>
  key.revoked ? '已撤销' : new Date(key.expiresAt).getTime() <= now.value ? '已过期' : '有效'
const activeCount = computed(() =>
  isKeys.value
    ? keys.value.filter((k) => status(k) === '有效').length
    : grants.value.filter((g) => g.status === 1).length,
)
let generation = 0
async function load() {
  const version = ++generation
  loading.value = true
  error.value = ''
  try {
    if (isKeys.value) {
      const result = await workspaceApi.keys()
      if (version === generation) keys.value = result
    } else {
      const result = await workspaceApi.applications()
      if (version === generation) grants.value = result
    }
  } catch (e) {
    if (version === generation) error.value = handleApiError(e, router)
  } finally {
    if (version === generation) loading.value = false
  }
}
function newKey() {
  if (creating.value) return
  if (secret.value && !saved.value) {
    modal.value = true
    message.warning('请先保存当前密钥，避免丢失后无法找回')
    return
  }
  form.name = ''
  form.scopes = ['profile:read']
  form.days = 30
  secret.value = ''
  saved.value = false
  modal.value = true
}
async function create() {
  if (creating.value) return
  if (!form.name.trim() || !form.scopes.length) {
    message.warning('请填写名称并至少选择一项权限')
    return
  }
  creating.value = true
  const account = session.state.externalId
  try {
    const result = await workspaceApi.createKey(form.name, form.scopes, form.days)
    if (!alive || account !== session.state.externalId) return
    secret.value = result.token
    await load()
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    creating.value = false
  }
}
function close() {
  if (creating.value) return
  if (secret.value && !saved.value) {
    message.warning('请先保存密钥并确认；关闭后无法再次查看完整密钥')
    return
  }
  modal.value = false
  secret.value = ''
  saved.value = false
}
async function copy() {
  try {
    await copyText(secret.value)
    message.success('密钥已复制，请妥善保存')
  } catch (e) {
    message.error(String(e))
  }
}
function revokeKey(key: PersonalApiKey) {
  dialog.warning({
    title: '撤销 API Key',
    content: `使用「${key.name}」的脚本将立即无法继续访问。此操作无法恢复。`,
    positiveText: '撤销密钥',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = key.id
      try {
        await workspaceApi.revokeKey(key.id)
        await load()
        message.success('密钥已撤销')
      } catch (e) {
        message.error(handleApiError(e, router))
      } finally {
        busy.value = ''
      }
    },
  })
}
function revokeGrant(grant: ApplicationGrant) {
  dialog.warning({
    title: '撤销应用授权',
    content: `「${grant.clientName}」将无法继续以你的身份访问，现有该平台登录会话也将退出。重新使用需要再次获得平台授权。`,
    positiveText: '撤销授权',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = grant.clientCode
      try {
        await workspaceApi.revokeApplication(grant.clientCode)
        await load()
        message.success('应用授权已撤销')
      } catch (e) {
        message.error(handleApiError(e, router))
      } finally {
        busy.value = ''
      }
    },
  })
}
function applicationOrigin(uri: string | null) {
  if (!uri) return '未提供回调地址'
  try {
    return new URL(uri).origin
  } catch {
    return '未提供有效回调地址'
  }
}
watch(isKeys, () => {
  modal.value = false
  secret.value = ''
  void load()
})
function needsProtection() {
  return creating.value || Boolean(secret.value && !saved.value)
}
function protectUnload(event: BeforeUnloadEvent) {
  if (needsProtection()) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onBeforeRouteLeave(() => {
  if (creating.value) {
    message.warning('密钥正在创建，请稍候')
    return false
  }
  if (!needsProtection()) return true
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '完整密钥尚未保存',
      content: '离开后无法再次查看完整密钥。请先保存，或明确放弃本次展示。',
      positiveText: '留下保存',
      negativeText: '放弃并离开',
      onPositiveClick: () => {
        resolve(false)
      },
      onNegativeClick: () => {
        resolve(true)
      },
      onClose: () => {
        resolve(false)
      },
      onEsc: () => {
        resolve(false)
      },
      onMaskClick: () => {
        resolve(false)
      },
    })
  })
})
watch(
  () => session.state.externalId,
  () => {
    secret.value = ''
    saved.value = false
    modal.value = false
    generation++
  },
)
onMounted(() => {
  void load()
  clock = setInterval(() => {
    now.value = Date.now()
  }, 30000)
  window.addEventListener('beforeunload', protectUnload)
})
onBeforeUnmount(() => {
  alive = false
  generation++
  secret.value = ''
  if (clock) clearInterval(clock)
  window.removeEventListener('beforeunload', protectUnload)
})
</script>
<template>
  <page-container
    :title="isKeys ? '个人 API Key' : '已授权应用'"
    :description="
      isKeys
        ? '为个人脚本创建最小权限密钥，控制有效期与访问范围'
        : '管理使用你账号登录的应用与平台授权'
    "
    ><template #extra
      ><n-button :loading="loading" @click="load">刷新</n-button
      ><n-button v-if="isKeys" type="primary" @click="newKey">创建 API Key</n-button></template
    >
    <div class="security-layout">
      <div class="security-main">
        <section-card
          :title="isKeys ? '我的密钥' : '应用授权记录'"
          :description="`${activeCount} 项有效${isKeys ? '密钥' : '授权'}`"
          ><n-alert v-if="error" type="error"
            >{{ error }}<n-button text @click="load">重试</n-button></n-alert
          ><n-spin :show="loading"
            ><template v-if="isKeys"
              ><article v-for="key in keys" :key="key.id" class="security-row">
                <div class="security-icon">KEY</div>
                <div class="security-data">
                  <h3>
                    {{ key.name }}
                    <n-tag size="small" :type="status(key) === '有效' ? 'success' : 'default'">{{
                      status(key)
                    }}</n-tag>
                  </h3>
                  <code>{{ key.prefix }}••••••••</code>
                  <div class="key-scopes">
                    <n-tag v-for="s in key.scopes" :key="s" size="small" :bordered="false">{{
                      scopeNames[s] || s
                    }}</n-tag>
                  </div>
                  <div class="security-dates">
                    <span>创建 {{ formatDateTime(key.createdAt) }}</span
                    ><span>到期 {{ formatDateTime(key.expiresAt) }}</span
                    ><span
                      >最近使用
                      {{ key.lastUsedAt ? formatDateTime(key.lastUsedAt) : '尚未使用' }}</span
                    >
                  </div>
                </div>
                <n-button
                  size="small"
                  type="error"
                  secondary
                  :disabled="key.revoked"
                  :loading="busy === key.id"
                  @click="revokeKey(key)"
                  >撤销</n-button
                >
              </article>
              <n-empty
                v-if="!keys.length && !error"
                description="尚未创建个人密钥"
                class="security-empty"
            /></template>
            <template v-else
              ><article v-for="grant in grants" :key="grant.clientCode" class="security-row">
                <div class="security-icon app-icon">{{ grant.clientName.slice(0, 1) }}</div>
                <div class="security-data">
                  <h3>
                    {{ grant.clientName }}
                    <n-tag size="small" :type="grant.status === 1 ? 'success' : 'default'">{{
                      grant.status === 1 ? '已授权' : grant.status === 2 ? '已停用' : '已撤销'
                    }}</n-tag>
                  </h3>
                  <p>{{ applicationOrigin(grant.redirectUri) }}</p>
                  <p class="security-client">客户端：{{ grant.clientCode }}</p>
                  <div class="security-dates">
                    <span>授权时间 {{ formatDateTime(grant.authorizedAt) }}</span
                    ><span v-if="grant.essential">门户基础授权</span>
                  </div>
                </div>
                <n-button
                  size="small"
                  :type="grant.essential ? 'default' : 'error'"
                  secondary
                  :disabled="grant.essential || grant.status !== 1"
                  :loading="busy === grant.clientCode"
                  @click="revokeGrant(grant)"
                  >{{ grant.essential ? '基础授权' : '撤销授权' }}</n-button
                >
              </article>
              <n-empty
                v-if="!grants.length && !error"
                description="暂无应用授权"
                class="security-empty" /></template></n-spin
        ></section-card>
      </div>
      <aside class="security-aside">
        <section-card :title="isKeys ? '按需授予权限' : '授权与你的账号'"
          ><p>
            {{
              isKeys
                ? '密钥与个人账号绑定，只能操作你自己的资料和文件。管理员身份不会扩大密钥权限。'
                : '撤销后，该应用的登录和刷新令牌将失效；其他应用和门户会话继续保留。'
            }}
          </p>
          <p>
            {{
              isKeys
                ? '完整密钥仅在创建时展示一次，后端仅保存摘要。遗失后请撤销并创建新密钥。'
                : '门户 web 为基础授权，保持账号自助入口可用；可在个人中心退出所有设备。'
            }}
          </p>
          <n-button
            text
            type="primary"
            @click="router.push(isKeys ? '/console/applications' : '/console/api-keys')"
            >{{ isKeys ? '管理已授权应用' : '管理个人 API Key' }} →</n-button
          ></section-card
        ><section-card v-if="isKeys" title="调用方式"
          ><p>使用请求头传递密钥：</p>
          <pre>Authorization: Bearer ynk_…</pre>
          <p>读取资料：GET /api/v1/user/profile<br />文件列表：GET /api/v1/file/me</p>
          <p>
            最多 20 个有效密钥；有效期最长 90 天。密钥不能管理授权、创建分享或访问管理后台。
          </p></section-card
        ><section-card v-else title="检查不熟悉的授权"
          ><p>
            若发现陌生应用，请撤销授权，并检查账号登录情况。应用显示的地址是已登记的回调来源。
          </p></section-card
        >
      </aside>
    </div>
    <n-modal
      :show="modal"
      preset="card"
      title="创建个人 API Key"
      style="width: 540px; max-width: calc(100vw - 32px)"
      :mask-closable="false"
      :close-on-esc="false"
      @update:show="
        (value) => {
          if (!value) close()
        }
      "
      ><template v-if="secret"
        ><n-alert type="warning" title="完整密钥仅展示这一次"
          >请现在保存。不要分享给他人或提交到公开仓库。</n-alert
        ><n-input
          :value="secret"
          readonly
          type="textarea"
          aria-label="新创建的完整密钥"
          style="margin: 20px 0; font-family: monospace"
        /><n-button @click="copy">复制密钥</n-button>
        <div style="margin: 24px 0">
          <n-checkbox v-model:checked="saved">我已保存密钥，了解关闭后无法再次查看</n-checkbox>
        </div>
        <n-button block type="primary" :disabled="!saved" @click="close">完成</n-button></template
      ><n-form v-else label-placement="top" @submit.prevent="create"
        ><n-form-item label="密钥名称"
          ><n-input
            v-model:value="form.name"
            maxlength="64"
            placeholder="例如：个人备份脚本" /></n-form-item
        ><n-form-item label="访问权限"
          ><n-checkbox-group v-model:value="form.scopes"
            ><div class="scope-options">
              <n-checkbox value="profile:read">读取个人资料</n-checkbox
              ><n-checkbox value="files:read">查看与下载本人文件</n-checkbox
              ><n-checkbox value="files:write">上传与删除本人文件</n-checkbox>
            </div></n-checkbox-group
          ></n-form-item
        ><n-form-item label="有效期"
          ><n-select
            v-model:value="form.days"
            :options="[
              { label: '7 天', value: 7 },
              { label: '30 天', value: 30 },
              { label: '90 天', value: 90 },
            ]" /></n-form-item
        ><n-button block attr-type="submit" type="primary" :loading="creating"
          >创建并显示密钥</n-button
        ></n-form
      ></n-modal
    >
  </page-container>
</template>
<style scoped>
.security-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 20px;
  align-items: start;
}
.security-aside {
  display: grid;
  gap: 18px;
}
.security-aside p {
  font-size: 12px;
  line-height: 1.9;
  color: var(--yuna-gray-600);
  margin-bottom: 14px;
}
.security-aside pre {
  font-size: 11px;
  overflow: auto;
  padding: 12px;
  background: var(--yuna-gray-50);
  border-radius: 8px;
  margin: 12px 0;
}
.security-row {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  border-bottom: 1px solid var(--yuna-gray-100);
  padding: 22px 0;
}
.security-row:first-child {
  padding-top: 0;
}
.security-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.security-data {
  flex: 1;
  min-width: 0;
}
.security-data h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  margin-bottom: 8px;
  overflow-wrap: anywhere;
  flex-wrap: wrap;
}
.security-data p {
  font-size: 12px;
  color: var(--yuna-gray-600);
  margin: 5px 0;
  overflow-wrap: anywhere;
}
.security-data code {
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.security-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--yuna-gray-100);
  color: var(--yuna-gray-600);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
.app-icon {
  font-size: 21px;
}
.key-scopes {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 14px 0;
}
.security-dates {
  display: flex;
  gap: 8px 24px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--yuna-gray-600);
  margin-top: 12px;
}
.scope-options {
  display: grid;
  gap: 14px;
}
.security-empty {
  padding: 50px 0;
}
@media (max-width: 1150px) {
  .security-layout {
    grid-template-columns: 1fr;
  }
  .security-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .security-aside {
    grid-template-columns: 1fr;
  }
  .security-row {
    gap: 10px;
    flex-wrap: wrap;
  }
  .security-data {
    min-width: 180px;
  }
}
</style>
