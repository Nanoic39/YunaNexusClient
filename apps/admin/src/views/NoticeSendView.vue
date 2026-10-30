<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  useMessage,
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import {
  PageContainer,
  PageEmpty,
  SectionCard,
  noticeChannelText,
} from '@yuna/ui'
import { audienceApi, noticeAdminApi, permissionApi, roleApi, usersToReceivers } from '@yuna/core'
import type {
  AudienceMode,
  NoticeChannel,
  NoticeSendPayload,
  NoticeTemplateView,
} from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()

/* ------------------------------ 模板数据 ------------------------------ */

const templates = ref<NoticeTemplateView[]>([])
const templatesLoading = ref(false)

const templateOptions = computed(() =>
  templates.value
    .filter((t) => t.status === 1)
    .map((t) => ({
      label: `${t.templateName}（${t.templateCode}）`,
      value: t.templateCode,
    })),
)

async function loadTemplates(): Promise<void> {
  templatesLoading.value = true
  try {
    const result = await noticeAdminApi.listTemplates({ page: 1, size: 100 })
    templates.value = result.records
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    templatesLoading.value = false
  }
}

/* ------------------------------ 受众资源（角色 / 权限） ------------------------------ */

const roleOptions = ref<{ label: string; value: number }[]>([])
const permissionOptions = ref<{ label: string; value: number }[]>([])
const audienceLoading = ref(false)

async function loadAudienceOptions(): Promise<void> {
  audienceLoading.value = true
  try {
    const [roles, permissions] = await Promise.all([roleApi.list(), permissionApi.list()])
    roleOptions.value = roles.map((role) => ({
      label: `${role.roleName}（${role.roleCode}）`,
      value: role.id,
    }))
    permissionOptions.value = permissions.map((permission) => ({
      label: permission.description
        ? `${permission.permCode} · ${permission.description}`
        : permission.permCode,
      value: permission.id,
    }))
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    audienceLoading.value = false
  }
}

/* ------------------------------ 发送表单 ------------------------------ */

const formRef = ref<FormInst | null>(null)
const sending = ref(false)

const form = reactive<{
  templateCode: string | null
  channel: NoticeChannel | null
  delayLevel: number
}>({
  templateCode: null,
  channel: null,
  delayLevel: 0,
})

/** 接收方式：手动指定 / 全部用户 / 按角色 / 按权限 */
const receiverMode = ref<AudienceMode>('users')
/** 手动指定时的接收方（站内信为 ID，邮件为邮箱） */
const manualReceivers = ref<string[]>([])
const selectedRoleIds = ref<number[]>([])
const selectedPermissionIds = ref<number[]>([])

const receiverModeOptions = [
  { label: '手动指定', value: 'users' },
  { label: '全部用户', value: 'all' },
  { label: '按角色', value: 'roles' },
  { label: '按权限', value: 'permissions' },
]

const channelOptions = [
  { label: '站内信', value: 1 },
  { label: '邮件（需配置发送通道）', value: 2 },
  { label: '短信（暂未接入）', value: 3, disabled: true },
]

/** RocketMQ 延迟等级 1~18，0 表示立即发送 */
const delayOptions = [
  { label: '立即发送', value: 0 },
  { label: '1 秒', value: 1 },
  { label: '5 秒', value: 2 },
  { label: '10 秒', value: 3 },
  { label: '30 秒', value: 4 },
  { label: '1 分钟', value: 5 },
  { label: '2 分钟', value: 6 },
  { label: '3 分钟', value: 7 },
  { label: '4 分钟', value: 8 },
  { label: '5 分钟', value: 9 },
  { label: '10 分钟', value: 14 },
  { label: '30 分钟', value: 16 },
  { label: '1 小时', value: 17 },
  { label: '2 小时', value: 18 },
]

const rules: FormRules = {
  templateCode: [{ required: true, message: '请选择通知模板', trigger: ['change', 'blur'] }],
}

const selectedTemplate = computed<NoticeTemplateView | null>(
  () => templates.value.find((t) => t.templateCode === form.templateCode) ?? null,
)

/** 生效通道：显式选择优先，否则取模板配置 */
const effectiveChannel = computed<NoticeChannel | null>(
  () => form.channel ?? selectedTemplate.value?.channel ?? null,
)

/** 从模板标题 / 正文中提取 `${占位符}`，去重保序 */
const placeholders = computed<string[]>(() => {
  const template = selectedTemplate.value
  if (!template) return []
  const source = `${template.title}\n${template.content}`
  const keys: string[] = []
  const matched = source.matchAll(/\$\{(\w+)\}/g)
  for (const match of matched) {
    const key = match[1]
    if (!keys.includes(key)) keys.push(key)
  }
  return keys
})

const params = reactive<Record<string, string>>({})

function syncParams(): void {
  for (const key of Object.keys(params)) {
    if (!placeholders.value.includes(key)) delete params[key]
  }
  for (const key of placeholders.value) {
    if (!(key in params)) params[key] = ''
  }
}

function onTemplateChange(): void {
  form.channel = null
  syncParams()
}

function renderPreview(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\$\{(\w+)\}/g, (raw, key: string) => params[key] || raw)
}

const previewTitle = computed(() => renderPreview(selectedTemplate.value?.title))
const previewContent = computed(() => renderPreview(selectedTemplate.value?.content))

const RECEIVER_HINT: Record<number, string> = {
  1: '站内信接收方为用户 ID（见用户管理）',
  2: '邮件接收方为邮箱地址',
  3: '短信接收方为手机号',
}

const receiverPlaceholder = computed(() => {
  const channel = effectiveChannel.value
  return channel ? `${RECEIVER_HINT[channel]}，回车确认` : '输入接收方后回车确认'
})

const resolving = ref(false)

/** 按接收方式解析出接收方字符串列表；无法解析时抛出带提示的错误 */
async function resolveReceivers(): Promise<string[]> {
  if (receiverMode.value === 'users') {
    const values = manualReceivers.value.map((value) => value.trim()).filter(Boolean)
    if (!values.length) throw new Error('请至少填写一个接收方')
    return values
  }
  const channel = effectiveChannel.value
  if (channel === null) throw new Error('请先选择通知模板或通知通道')
  resolving.value = true
  try {
    const users = await audienceApi.resolveUsers({
      mode: receiverMode.value,
      roleIds: selectedRoleIds.value,
      permissionIds: selectedPermissionIds.value,
    })
    return usersToReceivers(users, channel)
  } finally {
    resolving.value = false
  }
}

async function submit(): Promise<void> {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  if (!form.templateCode) return
  if (effectiveChannel.value === 3) {
    message.warning('短信通道暂未接入，请选择站内信或已配置的邮件通道')
    return
  }
  if (receiverMode.value === 'roles' && !selectedRoleIds.value.length) {
    message.warning('请至少选择一个角色')
    return
  }
  if (receiverMode.value === 'permissions' && !selectedPermissionIds.value.length) {
    message.warning('请至少选择一个权限')
    return
  }

  let receivers: string[]
  try {
    receivers = await resolveReceivers()
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '接收方解析失败')
    return
  }

  if (!receivers.length) {
    message.warning('未解析到任何接收方，请调整接收方式或选择条件')
    return
  }
  if (effectiveChannel.value === 1 && receivers.some((value) => !/^[1-9][0-9]*$/.test(value))) {
    message.warning('站内信接收方须为用户 ID，可在用户管理中查看')
    return
  }

  const payload: NoticeSendPayload = {
    templateCode: form.templateCode,
    channel: form.channel ?? undefined,
    receivers,
    params: placeholders.value.length ? { ...params } : undefined,
    delayLevel: form.delayLevel,
  }
  sending.value = true
  try {
    const created = await noticeAdminApi.send(payload)
    message.success(`已提交 ${created.length} 条通知`)
    resetForm()
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    sending.value = false
  }
}

function resetForm(): void {
  form.templateCode = null
  form.channel = null
  form.delayLevel = 0
  receiverMode.value = 'users'
  manualReceivers.value = []
  selectedRoleIds.value = []
  selectedPermissionIds.value = []
  for (const key of Object.keys(params)) delete params[key]
}

onMounted(() => {
  void loadTemplates()
  void loadAudienceOptions()
})
</script>

<template>
  <page-container title="发送通知" description="选择模板 → 填写接收方与占位符参数 → 经延迟消息异步投递">
    <div class="notice-send">
      <section-card title="发送配置">
        <n-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-placement="top"
          require-mark-placement="right-hanging"
        >
          <n-grid :cols="2" :x-gap="16" :y-gap="4" responsive="screen" item-responsive>
            <n-grid-item span="2 s:2 m:1">
              <n-form-item label="通知模板" path="templateCode">
                <n-select
                  v-model:value="form.templateCode"
                  :options="templateOptions"
                  :loading="templatesLoading"
                  filterable
                  placeholder="请选择启用中的模板"
                  @update:value="onTemplateChange"
                />
              </n-form-item>
            </n-grid-item>
            <n-grid-item span="2 s:2 m:1">
              <n-form-item label="通知通道">
                <n-select
                  v-model:value="form.channel"
                  :options="channelOptions"
                  clearable
                  :placeholder="
                    selectedTemplate
                      ? `跟随模板：${noticeChannelText(selectedTemplate.channel)}`
                      : '跟随模板配置'
                  "
                />
              </n-form-item>
            </n-grid-item>
            <n-grid-item span="2">
              <n-form-item label="接收方式">
                <n-radio-group v-model:value="receiverMode">
                  <n-radio-button
                    v-for="option in receiverModeOptions"
                    :key="option.value"
                    :value="option.value"
                    :label="option.label"
                  />
                </n-radio-group>
              </n-form-item>
            </n-grid-item>
            <n-grid-item span="2">
              <n-form-item label="接收方">
                <n-select
                  v-if="receiverMode === 'users'"
                  v-model:value="manualReceivers"
                  multiple
                  filterable
                  tag
                  :placeholder="receiverPlaceholder"
                />
                <n-select
                  v-else-if="receiverMode === 'roles'"
                  v-model:value="selectedRoleIds"
                  multiple
                  filterable
                  :options="roleOptions"
                  :loading="audienceLoading"
                  placeholder="勾选角色，向其下全部用户发送"
                />
                <n-select
                  v-else-if="receiverMode === 'permissions'"
                  v-model:value="selectedPermissionIds"
                  multiple
                  filterable
                  :options="permissionOptions"
                  :loading="audienceLoading"
                  placeholder="勾选权限，向拥有该权限的用户发送"
                />
                <n-alert v-else type="info" :show-icon="false" style="width: 100%">
                  将向系统内全部用户发送（站内信取用户 ID，邮件取邮箱）
                </n-alert>
              </n-form-item>
            </n-grid-item>
            <n-grid-item span="2 s:2 m:1">
              <n-form-item label="延迟发送">
                <n-select v-model:value="form.delayLevel" :options="delayOptions" />
              </n-form-item>
            </n-grid-item>
          </n-grid>

          <n-form-item v-if="placeholders.length" label="占位符参数">
            <div class="notice-send__params">
              <div v-for="key in placeholders" :key="key" class="notice-send__param">
                <n-input v-model:value="params[key]" :placeholder="key" />
                <span class="notice-send__param-key">${ {{ key }} }</span>
              </div>
            </div>
          </n-form-item>
        </n-form>

        <div class="notice-send__footer">
          <n-button @click="resetForm">重置</n-button>
          <n-button type="primary" :loading="sending || resolving" @click="submit">发送通知</n-button>
        </div>
      </section-card>

      <section-card title="内容预览" description="按当前占位符参数实时渲染，未填充处保留原样">
        <page-empty
          v-if="!selectedTemplate"
          description="选择模板后可预览渲染效果"
        />
        <div v-else class="notice-send__preview">
          <div class="notice-send__preview-title">{{ previewTitle || '（标题为空）' }}</div>
          <div class="notice-send__preview-body">{{ previewContent || '（正文为空）' }}</div>
        </div>
      </section-card>
    </div>
  </page-container>
</template>

<style scoped>
.notice-send {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.notice-send__params {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  width: 100%;
}

.notice-send__param {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notice-send__param-key {
  flex: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  opacity: 0.7;
}

.notice-send__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.notice-send__preview {
  border: 1px solid var(--yuna-gray-200);
  border-radius: 8px;
  padding: 16px;
}

.notice-send__preview-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.notice-send__preview-body {
  white-space: pre-wrap;
  line-height: 1.7;
  opacity: 0.85;
}
</style>
