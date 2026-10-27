<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NInput,
  NEmpty,
  NAlert,
  NSpin,
  NPagination,
  NModal,
  NFormItem,
  NSelect,
  NCheckbox,
  NDrawer,
  NDrawerContent,
  NProgress,
  useMessage,
  useDialog,
} from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import {
  workspaceApi,
  publicFileUrl,
  formatBytes,
  saveBlob,
  shareUrl,
  copyText,
  UploadQueue,
} from '@yuna/core'
import type { FileView, UploadEntry } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
import { openContextMenu } from '@yuna/ui'
import type { ContextMenuItem } from '@yuna/ui'

const router = useRouter(),
  message = useMessage(),
  dialog = useDialog()
const rows = ref<FileView[]>([]),
  total = ref(0),
  page = ref(1),
  search = ref(''),
  applied = ref(''),
  loading = ref(false),
  error = ref(''),
  picker = ref<HTMLInputElement>(),
  selected = ref<number[]>([]),
  busy = ref(false)
const publicUploads = ref(false),
  batchPublic = ref(false)
const queue = shallowRef<UploadEntry[]>([]),
  uploading = ref(false)
let alive = true,
  listGeneration = 0,
  listController: AbortController | undefined
const uploader = new UploadQueue(
  (file, signal) => workspaceApi.upload(file, signal, batchPublic.value),
  (entries, running) => {
    queue.value = entries
    uploading.value = running
  },
  (error) => message.error(handleApiError(error, router)),
)
const complete = computed(
  () => queue.value.filter((q) => !['等待', '上传中'].includes(q.state)).length,
)
const retryCount = computed(
  () => queue.value.filter((q) => q.retryable && ['失败', '已取消'].includes(q.state)).length,
)
const uncertain = computed(() => queue.value.some((q) => q.state === '待确认'))
const sharing = ref<FileView>(),
  shareOpen = ref(false),
  shareBusy = ref(false),
  shareResult = ref(''),
  shareForm = reactive({ days: 7, code: '' })
const detail = ref<FileView>(),
  preview = ref(''),
  previewBusy = ref(false)
let previewVersion = 0
const allSelected = computed(
  () => rows.value.length > 0 && rows.value.every((r) => selected.value.includes(r.fileId)),
)
async function load() {
  const version = ++listGeneration
  listController?.abort()
  const controller = new AbortController()
  listController = controller
  loading.value = true
  error.value = ''
  try {
    const result = await workspaceApi.files(page.value, applied.value, controller.signal)
    if (!alive || version !== listGeneration) return
    const lastPage = Math.max(1, Math.ceil(result.total / 20))
    if (page.value > lastPage) {
      page.value = lastPage
      await load()
      return
    }
    rows.value = result.records
    total.value = result.total
    selected.value = []
  } catch (e) {
    if (alive && version === listGeneration && !controller.signal.aborted)
      error.value = handleApiError(e, router)
  } finally {
    if (alive && version === listGeneration) loading.value = false
  }
}
function find() {
  applied.value = search.value.trim()
  page.value = 1
  void load()
}
function toggle(file: FileView, value: boolean) {
  selected.value = value
    ? [...selected.value, file.fileId]
    : selected.value.filter((id) => id !== file.fileId)
}
async function filesChanged(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  await upload(files)
}
async function upload(files: File[]) {
  if (!files.length || uploading.value) return
  try {
    batchPublic.value = publicUploads.value
    await uploader.start(files)
    if (alive) await load()
  } catch (error) {
    message.error(String(error))
  }
}
async function retryUploads() {
  await uploader.retry()
  if (alive) await load()
}
function dropped(event: DragEvent) {
  void upload(Array.from(event.dataTransfer?.files ?? []))
}
/**
 * 文件行的右键菜单。
 *
 * 这里体现了"同一区域不同状态给不同菜单"：命中已选中的行时补一个批量删除，
 * 已公开的文件给出"取消公开"，未公开的给"创建公开链接"。
 */
function fileContextMenu(file: FileView): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { key: 'download', label: '下载', icon: 'download', onSelect: () => void download(file) },
    { key: 'rename', label: '重命名', icon: 'rename', onSelect: () => openRename(file) },
    { key: 'share', label: '分享…', icon: 'share', onSelect: () => share(file) },
    {
      key: 'visibility',
      label: file.publicAccess ? '取消公开链接' : '创建公开链接',
      icon: 'link',
      checked: file.publicAccess,
      onSelect: () => changeVisibility(file),
    },
    { key: 'inspect', label: '详情', icon: 'info', divider: true, onSelect: () => void inspect(file) },
  ]
  if (file.publicUrl) {
    items.splice(4, 0, {
      key: 'copy-public-url',
      label: '复制公开链接',
      icon: 'copy',
      onSelect: () => copy(file.publicUrl as string),
    })
  }
  const selectedFiles = rows.value.filter((row) => selected.value.includes(row.fileId))
  if (selected.value.includes(file.fileId) && selectedFiles.length > 1) {
    items.push({
      key: 'delete-selected',
      label: `删除选中的 ${selectedFiles.length} 个文件`,
      icon: 'delete',
      danger: true,
      divider: true,
      onSelect: () => remove(selectedFiles),
    })
  } else {
    items.push({
      key: 'delete',
      label: '删除',
      icon: 'delete',
      danger: true,
      divider: true,
      onSelect: () => remove([file]),
    })
  }
  return items
}

function onFileContextMenu(event: MouseEvent, file: FileView): void {
  // 右键未选中的行时先把它设为当前单选，避免"菜单对多选批量操作"的歧义
  if (!selected.value.includes(file.fileId)) {
    selected.value = [file.fileId]
  }
  openContextMenu({ x: event.clientX, y: event.clientY, items: fileContextMenu(file), opener: null })
}

async function download(file: FileView) {
  busy.value = true
  try {
    saveBlob(await workspaceApi.download(file.fileId), file.fileName)
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    busy.value = false
  }
}
const renaming = ref<FileView>(),
  renameName = ref(''),
  renameBusy = ref(false)
function openRename(file: FileView) {
  renaming.value = file
  renameName.value = file.fileName
}
async function saveRename() {
  const file = renaming.value
  if (!file || renameBusy.value) return
  const name = renameName.value.trim()
  if (!name || name.length > 255 || /[\\/\x00-\x1f\x7f]/.test(name)) {
    message.warning('请输入有效文件名，不能包含路径或控制字符')
    return
  }
  renameBusy.value = true
  try {
    const updated = await workspaceApi.rename(file.fileId, name)
    if (!alive) return
    rows.value = rows.value.map((row) => (row.fileId === updated.fileId ? updated : row))
    if (detail.value?.fileId === updated.fileId) detail.value = updated
    renaming.value = undefined
    message.success('文件已重命名，分享链接继续有效')
    await load()
  } catch (error) {
    if (alive) message.error(handleApiError(error, router))
  } finally {
    renameBusy.value = false
  }
}
function remove(files: FileView[]) {
  if (!files.length) return
  dialog.warning({
    title: `删除 ${files.length} 个文件`,
    content: '删除后无法恢复，指向这些文件的分享也将失效。',
    positiveText: '删除文件',
    negativeText: '取消',
    onPositiveClick: async () => {
      busy.value = true
      let failed = 0
      try {
        for (const f of files)
          try {
            await workspaceApi.delete(f.fileId)
          } catch {
            failed++
          }
        if (failed) message.error(`${failed} 个文件删除失败，请刷新后重试`)
        else message.success('文件已删除')
        await load()
      } finally {
        busy.value = false
      }
    },
  })
}
function changeVisibility(file: FileView) {
  const enabled = !file.publicAccess
  dialog.warning({
    title: enabled ? '公开文件' : '撤销公开访问',
    content: enabled
      ? '发布后，任何持有链接的人都可以无需登录访问，适用于博客图片等公开资源。确认公开此文件？'
      : '旧链接将立即失效；重新公开会生成新地址。已下载的副本无法收回。',
    positiveText: enabled ? '确认公开' : '设为私有',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (busy.value) return false
      busy.value = true
      try {
        const result = await workspaceApi.visibility(file.fileId, enabled)
        Object.assign(file, result)
        message.success(enabled ? '已公开，可复制外链' : '已设为私有')
      } catch (e) {
        message.error(handleApiError(e, router))
        return false
      } finally {
        busy.value = false
      }
    },
  })
}
function share(file: FileView) {
  sharing.value = file
  shareForm.days = 7
  shareForm.code = ''
  shareResult.value = ''
  shareOpen.value = true
}
async function createShare() {
  if (!sharing.value || shareBusy.value) return
  if (shareForm.code && !/^[A-Za-z0-9]{4,32}$/.test(shareForm.code)) {
    message.warning('提取码须为 4~32 位字母或数字')
    return
  }
  shareBusy.value = true
  try {
    const s = await workspaceApi.share(sharing.value.fileId, shareForm.days, shareForm.code)
    shareResult.value = shareUrl(s.shareId)
    message.success('分享已创建')
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    shareBusy.value = false
  }
}
async function copy(value: string) {
  try {
    await copyText(value)
    message.success('已复制')
  } catch (e) {
    message.error(String(e))
  }
}
function clearPreview() {
  previewVersion++
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}
async function inspect(file: FileView) {
  clearPreview()
  detail.value = file
  const version = previewVersion
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.contentType ?? '') ||
    file.size > 5 * 1024 * 1024
  )
    return
  previewBusy.value = true
  try {
    const blob = await workspaceApi.download(file.fileId)
    if (version === previewVersion)
      preview.value = URL.createObjectURL(new Blob([blob], { type: file.contentType! }))
  } catch (e) {
    message.error(handleApiError(e, router))
  } finally {
    if (version === previewVersion) previewBusy.value = false
  }
}
onMounted(load)
onBeforeUnmount(() => {
  alive = false
  listGeneration++
  listController?.abort()
  uploader.dispose()
  clearPreview()
})
</script>
<template>
  <page-container title="我的文件" description="集中管理个人文件，安全下载与分享">
    <template #extra
      ><input
        ref="picker"
        type="file"
        multiple
        hidden
        aria-label="选择上传文件"
        @change="filesChanged"
      /><n-button :disabled="uploading || busy" @click="router.push('/console/shares')"
        >管理分享</n-button
      ><n-button type="primary" :loading="uploading" @click="picker?.click()"
        >上传文件</n-button
      ></template
    >
    <div class="files-layout">
      <section-card
        title="文件库"
        :description="`共 ${total} 个文件 · 每页 20 条`"
        class="file-library"
      >
        <div class="file-toolbar">
          <n-input
            v-model:value="search"
            clearable
            placeholder="按文件名搜索"
            aria-label="搜索文件"
            maxlength="100"
            @keyup.enter="find"
          /><n-button :loading="loading" @click="find">搜索</n-button
          ><n-button
            :disabled="!selected.length || busy"
            type="error"
            secondary
            @click="remove(rows.filter((r) => selected.includes(r.fileId)))"
            >删除选中 {{ selected.length || '' }}</n-button
          >
        </div>
        <n-alert v-if="error" type="error" title="文件加载失败"
          >{{ error }}<n-button text @click="load">重试</n-button></n-alert
        >
        <n-spin :show="loading"
          ><div class="file-table-scroll">
            <table class="file-table">
              <thead>
                <tr>
                  <th class="check">
                    <n-checkbox
                      :checked="allSelected"
                      aria-label="选择本页所有文件"
                      @update:checked="
                        (value) => (selected = value ? rows.map((r) => r.fileId) : [])
                      "
                    />
                  </th>
                  <th>文件名称</th>
                  <th>大小</th>
                  <th>上传时间</th>
                  <th class="file-operations">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="file in rows"
                  :key="file.fileId"
                  @contextmenu.prevent.stop="onFileContextMenu($event, file)"
                >
                  <td>
                    <n-checkbox
                      :checked="selected.includes(file.fileId)"
                      :aria-label="`选择 ${file.fileName}`"
                      @update:checked="(value) => toggle(file, value)"
                    />
                  </td>
                  <td>
                    <button class="file-name" @click="inspect(file)">
                      <span class="file-kind">{{
                        (file.ext || 'FILE').slice(0, 5).toUpperCase()
                      }}</span
                      ><span
                        >{{ file.fileName }}
                        <small>{{ file.publicAccess ? '公开' : '私有' }}</small></span
                      >
                    </button>
                  </td>
                  <td class="nowrap">{{ formatBytes(file.size) }}</td>
                  <td class="nowrap muted">{{ formatDateTime(file.createTime) }}</td>
                  <td>
                    <div class="file-actions">
                      <n-button
                        v-if="file.publicAccess && file.publicUrl"
                        text
                        size="small"
                        :disabled="busy"
                        @click="copy(publicFileUrl(file.publicUrl))"
                        >复制外链</n-button
                      >
                      <n-button
                        text
                        size="small"
                        :disabled="busy"
                        @click="changeVisibility(file)"
                        >{{ file.publicAccess ? '设为私有' : '公开' }}</n-button
                      >
                      <n-button text size="small" :disabled="busy" @click="download(file)"
                        >下载</n-button
                      ><n-button
                        text
                        size="small"
                        :disabled="busy || renameBusy"
                        @click="openRename(file)"
                        >重命名</n-button
                      ><n-button text size="small" @click="share(file)">分享</n-button
                      ><n-button
                        text
                        size="small"
                        type="error"
                        :disabled="busy"
                        @click="remove([file])"
                        >删除</n-button
                      >
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <n-empty
            v-if="!rows.length && !error"
            :description="applied ? '没有匹配的文件' : '还没有文件，上传第一个吧'"
            class="empty-files"
        /></n-spin>
        <div class="file-pagination">
          <span class="muted">{{
            selected.length ? `已选择 ${selected.length} 项` : '仅显示本人上传的文件'
          }}</span
          ><n-pagination
            v-model:page="page"
            :item-count="total"
            :page-size="20"
            :page-slot="5"
            :disabled="loading"
            @update:page="load"
          />
        </div>
      </section-card>
      <aside class="file-aside">
        <section-card title="上传文件"
          ><n-checkbox v-model:checked="publicUploads" :disabled="uploading"
            >上传后公开（适用于博客图片）</n-checkbox
          >
          <p class="muted">默认私有。公开文件可通过外链匿名访问，也可随时撤销。</p>
          <div class="drop-zone" @dragover.prevent @drop.prevent="dropped">
            <strong>拖动文件到这里</strong><span>或点击顶部「上传文件」</span
            ><small>单个文件最大 20MB，每批最多 20 个</small>
          </div></section-card
        >
        <section-card v-if="queue.length" title="上传队列"
          ><n-progress
            type="line"
            :percentage="Math.round((complete / queue.length) * 100)"
            :show-indicator="false"
          />
          <p class="muted" role="status">
            已处理 {{ complete }} / {{ queue.length }} 项 · 成功
            {{ queue.filter((q) => q.state === '完成').length }} 项
          </p>
          <ul class="upload-queue">
            <li v-for="(q, i) in queue" :key="i">
              <span :title="q.file.name">{{ q.file.name }}</span
              ><small :class="{ failed: q.state === '失败' }" :title="q.error">{{ q.state }}</small>
            </li>
          </ul>
          <n-button v-if="uploading" size="small" @click="uploader.cancel()">中止上传</n-button
          ><template v-else
            ><n-button v-if="retryCount" size="small" @click="retryUploads"
              >重试 / 继续 {{ retryCount }} 项</n-button
            ><n-button size="small" @click="queue = []">清空队列</n-button></template
          >
          <p v-if="uncertain" class="muted">
            网络中断或中止请求后，文件可能已保存。请先刷新列表确认；待确认项不会自动重传。
          </p></section-card
        >
        <section-card title="分享须知"
          ><p class="muted">
            分享仅对所选文件生效，可设置提取码与 1~30
            天有效期。删除文件或撤销分享后，原链接随即失效。
          </p>
          <n-button text type="primary" @click="router.push('/console/shares')"
            >查看我的分享 →</n-button
          ></section-card
        >
      </aside>
    </div>
    <n-modal
      :show="!!renaming"
      preset="card"
      title="重命名文件"
      style="width: 480px; max-width: calc(100vw - 32px)"
      :mask-closable="!renameBusy"
      :closable="!renameBusy"
      :close-on-esc="!renameBusy"
      @update:show="
        (value) => {
          if (!value && !renameBusy) renaming = undefined
        }
      "
    >
      <n-form-item label="文件名称"
        ><n-input
          v-model:value="renameName"
          autofocus
          maxlength="255"
          show-count
          :disabled="renameBusy"
          aria-label="新文件名称"
          @keydown.enter.prevent="saveRename"
      /></n-form-item>
      <p class="muted">请保留原扩展名。已有分享链接和文件内容不受影响。</p>
      <div class="file-actions">
        <n-button :disabled="renameBusy" @click="renaming = undefined">取消</n-button
        ><n-button
          type="primary"
          :loading="renameBusy"
          :disabled="!renameName.trim()"
          @click="saveRename"
          >保存名称</n-button
        >
      </div>
    </n-modal>
    <n-modal
      v-model:show="shareOpen"
      preset="card"
      title="创建文件分享"
      style="width: 480px; max-width: calc(100vw - 32px)"
      :mask-closable="!shareBusy"
      :closable="!shareBusy"
      :close-on-esc="!shareBusy"
    >
      <p class="share-file-name">{{ sharing?.fileName }}</p>
      <template v-if="!shareResult"
        ><n-form-item label="有效期"
          ><n-select
            v-model:value="shareForm.days"
            :disabled="shareBusy"
            :options="[
              { label: '1 天', value: 1 },
              { label: '7 天', value: 7 },
              { label: '30 天', value: 30 },
            ]" /></n-form-item
        ><n-form-item label="提取码（可选）"
          ><n-input
            v-model:value="shareForm.code"
            :disabled="shareBusy"
            maxlength="32"
            placeholder="4~32 位字母或数字；留空无需提取码" /></n-form-item
        ><n-button block type="primary" :loading="shareBusy" @click="createShare"
          >创建分享链接</n-button
        ></template
      >
      <template v-else
        ><n-alert type="success"
          >分享创建成功。拥有链接{{
            shareForm.code ? '和提取码' : ''
          }}的人可以在有效期内下载。</n-alert
        ><n-input :value="shareResult" readonly aria-label="分享链接" class="share-link" />
        <p v-if="shareForm.code">
          提取码：<strong>{{ shareForm.code }}</strong>
        </p>
        <div class="file-actions">
          <n-button type="primary" @click="copy(shareResult)">复制链接</n-button
          ><n-button v-if="shareForm.code" @click="copy(shareForm.code)">复制提取码</n-button>
        </div></template
      >
    </n-modal>
    <n-drawer
      style="max-width: 100vw"
      :show="!!detail"
      :width="420"
      placement="right"
      @update:show="
        (value) => {
          if (!value) {
            detail = undefined
            clearPreview()
          }
        }
      "
      ><n-drawer-content title="文件详情" closable
        ><template v-if="detail"
          ><n-spin :show="previewBusy"
            ><img v-if="preview" class="file-preview" :src="preview" alt="文件图片预览"
          /></n-spin>
          <h3 class="detail-name">{{ detail.fileName }}</h3>
          <dl class="file-facts">
            <dt>文件大小</dt>
            <dd>{{ formatBytes(detail.size) }}</dd>
            <dt>文件类型</dt>
            <dd>{{ detail.contentType || '未知' }}</dd>
            <dt>上传时间</dt>
            <dd>{{ formatDateTime(detail.createTime) }}</dd>
            <dt>SHA-256</dt>
            <dd class="digest">{{ detail.sha256 || '—' }}</dd>
          </dl>
          <div class="file-actions">
            <n-button type="primary" :loading="busy" @click="download(detail)">下载文件</n-button
            ><n-button @click="openRename(detail)">重命名</n-button
            ><n-button @click="share(detail)">创建分享</n-button>
          </div></template
        ></n-drawer-content
      ></n-drawer
    >
  </page-container>
</template>
<style scoped>
.files-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.file-aside {
  display: grid;
  gap: 18px;
}
.file-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.file-toolbar .n-input {
  max-width: 360px;
}
.file-table-scroll {
  overflow-x: auto;
}
.file-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}
.file-table th {
  text-align: left;
  color: var(--yuna-gray-600);
  font-size: 12px;
  font-weight: 500;
  background: var(--yuna-gray-50);
}
.file-table td,
.file-table th {
  padding: 13px 10px;
  border-bottom: 1px solid var(--yuna-gray-100);
}
.check {
  width: 28px;
}
.file-name {
  border: 0;
  background: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  min-width: 190px;
  max-width: 360px;
  overflow-wrap: anywhere;
}
.file-name:hover {
  color: var(--yuna-primary);
}
.file-kind {
  flex-shrink: 0;
  background: var(--yuna-gray-100);
  color: var(--yuna-gray-600);
  border-radius: 7px;
  padding: 9px 5px;
  font-size: 10px;
  font-weight: 600;
  min-width: 42px;
  text-align: center;
}
.file-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  white-space: nowrap;
}
.file-operations {
  width: 130px;
}
.nowrap {
  white-space: nowrap;
}
.muted {
  font-size: 12px;
  line-height: 1.8;
  color: var(--yuna-gray-600);
}
.file-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.drop-zone {
  border: 1px dashed var(--yuna-gray-300);
  border-radius: 10px;
  padding: 28px 12px;
  display: grid;
  gap: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.drop-zone strong {
  color: var(--yuna-gray-900);
  font-size: 14px;
}
.upload-queue {
  list-style: none;
  padding: 0;
  margin: 14px 0;
  max-height: 250px;
  overflow: auto;
}
.upload-queue li {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 12px;
}
.upload-queue li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-queue small {
  white-space: nowrap;
}
.failed {
  color: #d03050;
}
.empty-files {
  padding: 50px 10px;
}
.share-file-name {
  overflow-wrap: anywhere;
  margin-bottom: 22px;
  font-weight: 600;
}
.share-link {
  margin: 18px 0;
}
.file-preview {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 12px;
}
.detail-name {
  overflow-wrap: anywhere;
  margin: 20px 0;
}
.file-facts {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 15px;
  margin-bottom: 28px;
  font-size: 13px;
}
.file-facts dt {
  color: var(--yuna-gray-600);
}
.file-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.digest {
  font-family: monospace;
  font-size: 11px;
}
@media (max-width: 1200px) {
  .files-layout {
    grid-template-columns: 1fr;
  }
  .file-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .file-toolbar {
    flex-wrap: wrap;
  }
  .file-aside {
    grid-template-columns: 1fr;
  }
  .file-pagination {
    justify-content: center;
  }
}
</style>

<style scoped>
.upload-file {
  flex: 1;
  min-width: 0;
}
.upload-file > span {
  display: block;
}
.upload-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
  white-space: normal;
}
</style>
