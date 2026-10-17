<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NInput,
  NSelect,
  NCheckbox,
  NCheckboxGroup,
  NEmpty,
  NTag,
  NForm,
  NFormItem,
  NSpin,
  useMessage,
  useDialog,
} from 'naive-ui'
import { PageContainer, SectionCard } from '@yuna/ui'
import { applicationAccessApi, type AppAccessCatalog, type AppRole } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const route = useRoute(),
  router = useRouter(),
  message = useMessage(),
  dialog = useDialog()
const catalog = ref<AppAccessCatalog | null>(null),
  loading = ref(false),
  busy = ref(false),
  error = ref('')
const permission = reactive({ code: '', name: '' }),
  role = reactive({ code: '', name: '', permissions: [] as string[] }),
  member = reactive({ externalId: '', roles: [] as string[] })
const id = computed(() => Number(route.params.id)),
  options = computed(
    () =>
      catalog.value?.roles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.code })) || [],
  )
let alive = true,
  generation = 0
async function load() {
  const version = ++generation
  loading.value = true
  error.value = ''
  try {
    if (!Number.isSafeInteger(id.value) || id.value < 1) throw Error('应用标识无效')
    const result = await applicationAccessApi.catalog(id.value)
    if (alive && version === generation) catalog.value = result
  } catch (e) {
    if (alive && version === generation) error.value = handleApiError(e, router)
  } finally {
    if (alive && version === generation) loading.value = false
  }
}
async function save(action: () => Promise<void>) {
  if (busy.value || loading.value || !catalog.value) return
  busy.value = true
  try {
    await action()
    if (alive) {
      message.success('已保存，下一次鉴权立即生效')
      await load()
    }
  } catch (e) {
    if (alive) message.error(handleApiError(e, router))
  } finally {
    if (alive) busy.value = false
  }
}
function editPermission(item: { code: string; name: string }) {
  permission.code = item.code
  permission.name = item.name
}
function editRole(item: AppRole) {
  role.code = item.code
  role.name = item.name
  role.permissions =
    catalog.value?.bindings.filter((b) => b.roleCode === item.code).map((b) => b.permissionCode) ||
    []
}
function remove(kind: 'roles' | 'permissions', code: string) {
  dialog.warning({
    title: '删除业务权限定义',
    content: `确认删除 ${code}？相关授权绑定也会清理。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => save(() => applicationAccessApi.remove(id.value, kind, code)),
  })
}
async function loadMember() {
  if (busy.value || !member.externalId.trim()) return
  busy.value = true
  const version = generation
  try {
    const result = await applicationAccessApi.memberRoles(id.value, member.externalId.trim())
    if (alive && version === generation) {
      member.roles = result.roles
      message.success('已读取当前角色')
    }
  } catch (e) {
    if (alive) message.error(handleApiError(e, router))
  } finally {
    if (alive) busy.value = false
  }
}
function assign() {
  dialog.warning({
    title: '确认成员角色',
    content: member.roles.length
      ? '将用所选角色替换该用户在本应用的现有角色。'
      : '这会撤销该用户在本应用的全部角色。',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () =>
      save(() => applicationAccessApi.member(id.value, member.externalId.trim(), member.roles)),
  })
}
watch(
  id,
  () => {
    catalog.value = null
    permission.code = ''
    permission.name = ''
    role.code = ''
    role.name = ''
    role.permissions = []
    member.externalId = ''
    member.roles = []
    void load()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  alive = false
  generation++
})
</script>
<template>
  <page-container
    title="应用业务权限"
    description="在当前应用内管理权限与角色，不会授予平台管理员能力"
  >
    <template #extra
      ><n-button @click="router.push('/console/oauth-apps')">返回应用</n-button
      ><n-button :loading="loading" :disabled="busy" @click="load">刷新</n-button></template
    >
    <n-alert v-if="error" type="error" class="notice"
      >{{ error }} <n-button text @click="load">重试</n-button></n-alert
    >
    <n-spin :show="loading">
      <template v-if="catalog">
        <n-alert type="info" class="notice"
          >当前应用 {{ catalog.clientId }}。平台 scope 控制平台
          API；这里的角色控制你的业务操作。成员须先完成 OAuth
          授权，应用服务端再使用用户令牌和客户端凭证检查权限。</n-alert
        >
        <div class="access-grid">
          <section-card title="权限目录" description="代码在当前应用内唯一，例如 posts:publish">
            <n-form
              label-placement="top"
              @submit.prevent="
                save(() =>
                  applicationAccessApi.permission(id, {
                    code: permission.code.trim(),
                    name: permission.name.trim(),
                  }),
                )
              "
              ><div class="fields">
                <n-form-item label="权限代码"
                  ><n-input
                    v-model:value="permission.code"
                    maxlength="64"
                    placeholder="posts:publish" /></n-form-item
                ><n-form-item label="权限名称"
                  ><n-input v-model:value="permission.name" maxlength="100" placeholder="发布文章"
                /></n-form-item>
              </div>
              <n-button
                attr-type="submit"
                type="primary"
                :loading="busy"
                :disabled="!permission.code.trim() || !permission.name.trim()"
                >保存权限</n-button
              ></n-form
            >
            <n-empty v-if="!catalog.permissions.length" description="尚未定义权限" class="empty" />
            <ul v-else class="items">
              <li v-for="p in catalog.permissions" :key="p.code">
                <div>
                  <strong>{{ p.name }}</strong
                  ><code>{{ p.code }}</code>
                </div>
                <div>
                  <n-button text :disabled="busy" @click="editPermission(p)">编辑</n-button
                  ><n-button
                    text
                    type="error"
                    :disabled="busy"
                    @click="remove('permissions', p.code)"
                    >删除</n-button
                  >
                </div>
              </li>
            </ul>
          </section-card>
          <section-card title="角色与权限" description="保存会替换该角色完整权限集合">
            <n-form
              label-placement="top"
              @submit.prevent="
                save(() =>
                  applicationAccessApi.role(id, {
                    code: role.code.trim(),
                    name: role.name.trim(),
                    permissions: role.permissions,
                  }),
                )
              "
              ><div class="fields">
                <n-form-item label="角色代码"
                  ><n-input
                    v-model:value="role.code"
                    maxlength="64"
                    placeholder="editor" /></n-form-item
                ><n-form-item label="角色名称"
                  ><n-input v-model:value="role.name" maxlength="100" placeholder="编辑"
                /></n-form-item>
              </div>
              <n-form-item label="包含权限"
                ><n-checkbox-group v-model:value="role.permissions"
                  ><div class="checks">
                    <n-checkbox
                      v-for="p in catalog.permissions"
                      :key="p.code"
                      :value="p.code"
                      :label="`${p.name} (${p.code})`"
                    /></div></n-checkbox-group></n-form-item
              ><n-button
                attr-type="submit"
                type="primary"
                :loading="busy"
                :disabled="!role.code.trim() || !role.name.trim()"
                >保存角色</n-button
              ></n-form
            >
            <n-empty v-if="!catalog.roles.length" description="尚未定义角色" class="empty" />
            <ul v-else class="items">
              <li v-for="r in catalog.roles" :key="r.code">
                <div>
                  <strong>{{ r.name }}</strong
                  ><code>{{ r.code }}</code
                  ><n-tag size="small"
                    >{{
                      catalog.bindings.filter((b) => b.roleCode === r.code).length
                    }}
                    项权限</n-tag
                  >
                </div>
                <div>
                  <n-button text :disabled="busy" @click="editRole(r)">编辑</n-button
                  ><n-button text type="error" :disabled="busy" @click="remove('roles', r.code)"
                    >删除</n-button
                  >
                </div>
              </li>
            </ul>
          </section-card>
          <section-card
            title="成员授权"
            description="填写已授权本应用的用户外部标识；角色仅在本应用生效"
            class="member-card"
            ><n-form label-placement="top" @submit.prevent="assign"
              ><div class="fields">
                <n-form-item label="用户外部标识"
                  ><n-input
                    v-model:value="member.externalId"
                    maxlength="64"
                    placeholder="从 OAuth 身份接口获取" /></n-form-item
                ><n-form-item label="完整角色集合"
                  ><n-select
                    v-model:value="member.roles"
                    multiple
                    :options="options"
                    placeholder="空集合表示撤销全部角色"
                /></n-form-item>
              </div>
              <n-button :disabled="busy || !member.externalId.trim()" @click="loadMember"
                >读取当前角色</n-button
              >
              <n-button
                attr-type="submit"
                type="primary"
                :loading="busy"
                :disabled="!member.externalId.trim()"
                >应用成员角色</n-button
              ></n-form
            ></section-card
          >
        </div>
      </template>
    </n-spin>
  </page-container>
</template>
<style scoped>
.access-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.member-card {
  grid-column: 1/-1;
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.checks {
  display: grid;
  gap: 10px;
  max-height: 300px;
  overflow: auto;
}
.items {
  list-style: none;
  padding: 0;
  margin: 20px 0 0;
}
.items li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid var(--border-color, #e9ebef);
}
.items li > div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.items code {
  overflow-wrap: anywhere;
}
.notice {
  margin-bottom: 20px;
}
.empty {
  padding: 24px 0;
}
@media (max-width: 1100px) {
  .access-grid {
    grid-template-columns: 1fr;
  }
  .member-card {
    grid-column: auto;
  }
}
@media (max-width: 640px) {
  .fields {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .items li {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
