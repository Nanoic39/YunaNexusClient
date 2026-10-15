<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NAvatar,
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpin,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import {
  authApi,
  normalizeTags,
  profilePatch,
  safeAvatarUrl,
  session,
  toErrorMessage,
  userApi,
} from '@yuna/core'
import type { IdentityResult, UserBadge, UserProfileView, UserTag } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const saving = ref(false)
const savingTags = ref(false)
const submitting = ref(false)
const profile = ref<UserProfileView | null>(null)
const identity = ref<IdentityResult | null>(null)
const tags = ref<UserTag[]>([])
const savedTags = ref('[]')
const badges = ref<UserBadge[]>([])
const errors = reactive({ profile: '', tags: '', badges: '', identity: '' })
const form = reactive({ nickname: '', avatar: '', email: '' })
const newTag = reactive({ name: '', color: '#368fb2' })
const colorOptions = [
  { label: '湖蓝', value: '#368fb2' },
  { label: '青绿', value: '#2f9479' },
  { label: '紫色', value: '#8863bb' },
  { label: '橙色', value: '#bc732b' },
]
const avatarUrl = computed(() => safeAvatarUrl(form.avatar.trim(), window.location.origin))
const displayName = computed(() => profile.value?.nickname || profile.value?.username || '我的账号')
const dirty = computed(
  () =>
    profile.value &&
    ['nickname', 'avatar', 'email'].some(
      (key) =>
        form[key as keyof typeof form].trim() !== (profile.value?.[key as keyof typeof form] ?? ''),
    ),
)
const tagsDirty = computed(() => JSON.stringify(tags.value) !== savedTags.value)
const expiresAt = computed(() => session.state.expiresAt)
const clientCode = computed(() => session.state.clientCode || identity.value?.clientCode || '—')

function resetForm(): void {
  if (!profile.value) return
  form.nickname = profile.value.nickname ?? ''
  form.avatar = profile.value.avatar ?? ''
  form.email = profile.value.email ?? ''
}

async function load(): Promise<void> {
  loading.value = true
  const account = session.state.externalId
  const results = await Promise.allSettled([
    userApi.getProfile(),
    userApi.getTags(),
    userApi.getBadges(),
    authApi.me(),
  ])
  if (account !== session.state.externalId) {
    loading.value = false
    return
  }
  const [p, t, b, i] = results
  errors.profile = p.status === 'rejected' ? handleApiError(p.reason, router) : ''
  errors.tags = t.status === 'rejected' ? handleApiError(t.reason, router) : ''
  errors.badges = b.status === 'rejected' ? handleApiError(b.reason, router) : ''
  errors.identity = i.status === 'rejected' ? handleApiError(i.reason, router) : ''
  if (p.status === 'fulfilled') {
    profile.value = p.value
    resetForm()
    session.setNickname(p.value.nickname)
  }
  if (t.status === 'fulfilled') {
    tags.value = t.value
    savedTags.value = JSON.stringify(t.value)
  }
  if (b.status === 'fulfilled') badges.value = b.value
  if (i.status === 'fulfilled') identity.value = i.value
  loading.value = false
}

function refresh(): void {
  if (dirty.value || tagsDirty.value) {
    dialog.warning({
      title: '放弃未保存的修改？',
      content: '刷新将重新读取资料和标签。',
      positiveText: '重新加载',
      negativeText: '继续编辑',
      onPositiveClick: load,
    })
  } else void load()
}

async function saveProfile(): Promise<void> {
  if (!profile.value || saving.value) return
  const account = session.state.externalId
  try {
    const patch = profilePatch(profile.value, form, window.location.origin)
    if (!Object.keys(patch).length) return
    saving.value = true
    const result = await userApi.updateProfile(patch)
    if (account !== session.state.externalId) return
    profile.value = result
    resetForm()
    session.setNickname(result.nickname)
    message.success('个人资料已保存')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    saving.value = false
  }
}

function tagColor(tag: UserTag) {
  if (!tag.color || !/^#[0-9a-fA-F]{6}$/.test(tag.color)) return undefined
  return { color: tag.color + '12', textColor: tag.color, borderColor: tag.color + '55' }
}

function addTag(): void {
  const name = newTag.name.trim()
  if (!name) {
    message.warning('请输入标签名称')
    return
  }
  if (tags.value.some((tag) => tag.tagName === name)) {
    message.warning('已存在同名标签')
    return
  }
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
  try {
    tags.value = normalizeTags([
      ...tags.value,
      { tagCode: 'tag_' + random, tagName: name, color: newTag.color },
    ])
    newTag.name = ''
  } catch (error) {
    message.warning(toErrorMessage(error))
  }
}

async function saveTags(): Promise<void> {
  if (savingTags.value) return
  const account = session.state.externalId
  try {
    const normalized = normalizeTags(tags.value)
    savingTags.value = true
    const result = await userApi.saveTags({ tags: normalized })
    if (account !== session.state.externalId) return
    tags.value = result
    savedTags.value = JSON.stringify(result)
    message.success('标签已保存')
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    savingTags.value = false
  }
}

async function logout(): Promise<void> {
  submitting.value = true
  try {
    await authApi.logout()
  } catch {
    /* 即使网络不可用，也清理本地凭据 */
  }
  session.clearUser()
  submitting.value = false
  void router.replace({ name: 'login' })
}

function logoutAll(): void {
  dialog.warning({
    title: '退出所有设备',
    content: '将撤销该账号的全部会话，其他设备上的登录也会失效。',
    positiveText: '确认退出',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await authApi.logoutAll()
        session.clearUser()
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
  <page-container title="个人中心" description="管理个人资料、专属标签与登录会话">
    <template #extra
      ><n-button :loading="loading" :disabled="saving || savingTags" @click="refresh"
        >刷新资料</n-button
      ></template
    >
    <n-spin :show="loading">
      <div class="profile-sections">
        <section-card title="个人资料" description="联系邮箱仅用于个人资料展示，不修改登录邮箱">
          <n-alert v-if="errors.profile" type="error" title="资料加载失败">{{
            errors.profile
          }}</n-alert>
          <template v-else-if="profile">
            <div class="profile-summary">
              <n-avatar :src="avatarUrl" :size="64" round>{{ displayName.slice(0, 1) }}</n-avatar>
              <div>
                <h3>{{ displayName }}</h3>
                <p>@{{ profile.username }}</p>
              </div>
            </div>
            <n-form label-placement="top" :disabled="saving" @submit.prevent="saveProfile">
              <div class="profile-grid">
                <n-form-item label="昵称"
                  ><n-input
                    v-model:value="form.nickname"
                    aria-label="昵称"
                    maxlength="64"
                    show-count
                    placeholder="希望大家如何称呼你"
                /></n-form-item>
                <n-form-item label="联系邮箱"
                  ><n-input
                    v-model:value="form.email"
                    aria-label="联系邮箱"
                    maxlength="128"
                    placeholder="name@example.com"
                /></n-form-item>
                <n-form-item label="头像地址" class="profile-full"
                  ><n-input
                    v-model:value="form.avatar"
                    aria-label="头像地址"
                    maxlength="512"
                    placeholder="HTTPS 图片地址或本站图片路径；留空可清除"
                /></n-form-item>
              </div>
              <div class="actions">
                <n-button type="primary" :loading="saving" :disabled="!dirty" @click="saveProfile"
                  >保存资料</n-button
                ><n-button :disabled="!dirty || saving" @click="resetForm">取消修改</n-button>
              </div>
            </n-form>
            <n-descriptions :column="1" label-placement="left" class="profile-meta">
              <n-descriptions-item label="账号标识">{{ profile.externalId }}</n-descriptions-item>
              <n-descriptions-item label="注册时间">{{
                formatDateTime(profile.createTime)
              }}</n-descriptions-item>
              <n-descriptions-item v-if="profile.mobile" label="手机号"
                >{{ profile.mobileCountry }} {{ profile.mobile }}</n-descriptions-item
              >
            </n-descriptions>
          </template>
        </section-card>

        <section-card title="我的标签" description="最多 20 个标签，添加或移除后点击保存生效">
          <n-alert v-if="errors.tags" type="error" title="标签加载失败">{{ errors.tags }}</n-alert>
          <template v-else>
            <div class="tag-editor">
              <n-input
                v-model:value="newTag.name"
                aria-label="标签名称"
                placeholder="添加一个描述自己的标签"
                maxlength="32"
                :disabled="savingTags"
                @keyup.enter="addTag"
              />
              <n-select
                v-model:value="newTag.color"
                aria-label="标签颜色"
                :options="colorOptions"
                :disabled="savingTags"
              />
              <n-button :disabled="tags.length >= 20 || savingTags" @click="addTag"
                >添加标签</n-button
              >
            </div>
            <div v-if="tags.length" class="tags">
              <n-tag
                v-for="tag in tags"
                :key="tag.tagCode"
                closable
                :color="tagColor(tag)"
                :disabled="savingTags"
                @close="tags = tags.filter((item) => item.tagCode !== tag.tagCode)"
                >{{ tag.tagName }}</n-tag
              >
            </div>
            <n-empty v-else description="还没有标签，添加第一个吧" size="small" />
            <div class="actions">
              <n-button
                type="primary"
                :loading="savingTags"
                :disabled="!tagsDirty"
                @click="saveTags"
                >保存标签</n-button
              ><n-button :disabled="!tagsDirty || savingTags" @click="tags = JSON.parse(savedTags)"
                >撤销修改</n-button
              >
            </div>
          </template>
        </section-card>

        <section-card title="我的徽章" description="记录你的成长，由平台授予">
          <n-alert v-if="errors.badges" type="error" title="徽章加载失败">{{
            errors.badges
          }}</n-alert>
          <ul v-else-if="badges.length" class="badges">
            <li v-for="badge in badges" :key="badge.badgeCode">
              <strong>{{ badge.badgeName }}</strong
              ><n-tag size="small">Lv.{{ badge.badgeLevel }}</n-tag>
              <p>{{ badge.description || '继续探索，收集更多成长印记' }}</p>
              <small>{{ formatDateTime(badge.grantedTime) }}</small>
            </li>
          </ul>
          <n-empty v-else description="暂未获得徽章" size="small" />
        </section-card>

        <section-card title="登录与会话" description="管理当前登录，或退出其他设备">
          <n-alert v-if="errors.identity" type="warning">{{ errors.identity }}</n-alert>
          <n-descriptions :column="1" label-placement="left">
            <n-descriptions-item label="当前平台">{{ clientCode }}</n-descriptions-item>
            <n-descriptions-item label="会话到期">{{
              expiresAt ? formatDateTime(expiresAt) : '—'
            }}</n-descriptions-item>
          </n-descriptions>
          <div class="actions">
            <n-button :loading="submitting" @click="logout">退出当前登录</n-button
            ><n-button type="warning" secondary @click="logoutAll">退出所有设备</n-button>
          </div>
        </section-card>
      </div>
    </n-spin>
  </page-container>
</template>

<style scoped>
.profile-sections {
  display: grid;
  gap: 20px;
}
.profile-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.profile-summary h3 {
  margin: 0 0 4px;
  font-size: 20px;
}
.profile-summary p {
  margin: 0;
  color: var(--yuna-text-secondary);
}
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}
.profile-full {
  grid-column: 1 / -1;
}
.profile-meta {
  margin-top: 24px;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.tag-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px auto;
  gap: 12px;
  margin-bottom: 20px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.badges {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.badges li {
  padding: 16px;
  border: 1px solid var(--yuna-gray-100);
  border-radius: 12px;
}
.badges strong {
  margin-right: 12px;
}
.badges p {
  margin: 12px 0 8px;
}
.badges small {
  color: var(--yuna-text-secondary);
}
@media (max-width: 640px) {
  .profile-grid,
  .tag-editor {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
