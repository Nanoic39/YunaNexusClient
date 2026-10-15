<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
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
import { noticeAdminApi } from '@yuna/core'
import type { NoticeChannel, NoticeSendPayload, NoticeTemplateView } from '@yuna/core'
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

/* ------------------------------ 发送表单 ------------------------------ */

const formRef = ref<FormInst | null>(null)
const sending = ref(false)

const form = reactive<{
  templateCode: string | null
  channel: NoticeChannel | null
  receivers: string[]
  delayLevel: number
}>({
  templateCode: null,
  channel: null,
  receivers: [],
  delayLevel: 0,
})

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
  receivers: [
    {
      required: true,
      type: 'array',
      message: '请至少填写一个接收方',
      trigger: ['change', 'blur'],
    },
  ],
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
  1: '站内信接收方为用户名 / 用户 ID',
  2: '邮件接收方为邮箱地址',
  3: '短信接收方为手机号',
}

const receiverPlaceholder = computed(() => {
  const channel = effectiveChannel.value
  return channel ? `${RECEIVER_HINT[channel]}，回车确认` : '输入接收方后回车确认'
})

async function submit(): Promise<void> {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  if (!form.templateCode) return
  const payload: NoticeSendPayload = {
    templateCode: form.templateCode,
    channel: form.channel ?? undefined,
    receivers: form.receivers.map((r) => r.trim()).filter(Boolean),
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
  form.receivers = []
  form.delayLevel = 0
  for (const key of Object.keys(params)) delete params[key]
}

onMounted(loadTemplates)
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
            <n-grid-item span="2 s:2 m:1">
              <n-form-item label="接收方" path="receivers">
                <n-select
                  v-model:value="form.receivers"
                  multiple
                  filterable
                  tag
                  :placeholder="receiverPlaceholder"
                />
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
          <n-button type="primary" :loading="sending" @click="submit">发送通知</n-button>
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
  border: 1px solid var(--yuna-border-color, rgba(128, 128, 128, 0.2));
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
