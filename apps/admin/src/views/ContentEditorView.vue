<script setup lang="ts">
import { openContextMenu } from '@yuna/ui'
import type { ContextMenuItem } from '@yuna/ui'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NEmpty,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSwitch,
  useDialog,
  useMessage,
} from 'naive-ui'
import { ContentRenderer, PageContainer, SectionCard } from '@yuna/ui'
import { siteContent, uid } from '@yuna/core'
import { ReorderTwoOutline } from '@vicons/ionicons5'
import type { ContentElement, ContentElementType, ContentItem, ContentItemStatus, ContentPage } from '@yuna/core'

/**
 * 门户内容编辑器（管理端）。
 *
 * 与用户端共享同一份 `siteContent`：站点信息 / 页面 / 区块 / 元素 / 条目 均可在此增删改。
 * 内容以后端门户接口为准（`/api/v1/notice/portal`），改动在停止编辑后自动同步回后端。
 */

const message = useMessage()
const dialog = useDialog()

const state = siteContent.state

/* -------------------------------- 常量映射 -------------------------------- */

const ELEMENT_TYPES: { label: string; value: ContentElementType }[] = [
  { label: 'Hero 头图', value: 'hero' },
  { label: '文本段落', value: 'text' },
  { label: '清单', value: 'list' },
  { label: '指标', value: 'metrics' },
  { label: '卡片', value: 'cards' },
  { label: '链接组', value: 'links' },
  { label: '时间线', value: 'timeline' },
  { label: '服务状态图', value: 'services' },
  { label: '分割线', value: 'divider' },
]

const ELEMENT_LABEL = Object.fromEntries(ELEMENT_TYPES.map((t) => [t.value, t.label])) as Record<
  ContentElementType,
  string
>

const STATUS_OPTIONS = [
  { label: '未设置', value: '' },
  { label: '已完成', value: 'done' },
  { label: '进行中', value: 'doing' },
  { label: '待开发', value: 'todo' },
]

/** 服务状态图的条目状态使用运行态语义 */
const SERVICE_STATUS_OPTIONS = [
  { label: '未设置', value: '' },
  { label: '运行中', value: 'done' },
  { label: '维护中', value: 'doing' },
  { label: '未上线', value: 'todo' },
]

function statusOptionsOf(type: ContentElementType) {
  return type === 'services' ? SERVICE_STATUS_OPTIONS : STATUS_OPTIONS
}

function titlePlaceholder(type: ContentElementType): string {
  if (type === 'metrics') return '指标名称'
  if (type === 'services') return '服务名称'
  return '条目标题'
}

/** 元素是否需要「条目」列表（hero/text/divider 用不到或不以条目为主） */
const ITEM_FIELDS: Record<ContentElementType, { title: boolean; text: boolean; status: boolean; link: boolean; number: boolean; tags: boolean }> = {
  hero: { title: true, text: false, status: false, link: true, number: false, tags: false },
  text: { title: false, text: false, status: false, link: false, number: false, tags: false },
  list: { title: true, text: true, status: true, link: false, number: false, tags: false },
  metrics: { title: true, text: false, status: false, link: false, number: true, tags: false },
  cards: { title: true, text: true, status: true, link: true, number: false, tags: true },
  links: { title: true, text: true, status: false, link: true, number: false, tags: false },
  timeline: { title: true, text: true, status: true, link: false, number: false, tags: false },
  services: { title: true, text: true, status: true, link: false, number: false, tags: false },
  divider: { title: false, text: false, status: false, link: false, number: false, tags: false },
}

/* -------------------------------- 工厂函数 -------------------------------- */

function createElement(type: ContentElementType): ContentElement {
  return { id: uid('el'), type, title: '', text: '', items: [] }
}

function createItem(): ContentItem {
  return { id: uid('item'), title: '', text: '' }
}

function createSection() {
  return { id: uid('sec'), title: '', description: '', elements: [] as ContentElement[] }
}

/** 新建页面：支持「空白」与「标准（Hero + 文本）」两种模板 */
function createPage(title: string, path: string, nav: boolean, useTemplate: boolean): ContentPage {
  const page: ContentPage = {
    id: uid('page'),
    path: siteContent.normalizePath(path),
    title,
    description: '',
    nav,
    sections: [],
  }
  if (useTemplate) {
    const section = createSection()
    section.elements.push(
      { id: uid('el'), type: 'hero', title, text: '', items: [createItem()] },
      { id: uid('el'), type: 'text', text: '', items: [] },
    )
    page.sections.push(section)
  }
  return page
}

/* --------------------------------- 页面导航 -------------------------------- */

const activePageId = ref(state.pages[0]?.id ?? '')
const activePage = computed(() => state.pages.find((page) => page.id === activePageId.value))

/* ------------------------------ 载入与同步状态 ------------------------------ */

const meta = siteContent.meta

/** 同步状态文案：载入中 / 同步中 / 失败 / 已同步 / 未修改 */
const syncText = computed(() => {
  if (meta.loading) return '载入中…'
  if (meta.syncing) return '正在同步…'
  if (meta.error) return `同步失败：${meta.error}`
  if (meta.lastSyncedAt) {
    const time = new Date(meta.lastSyncedAt).toLocaleTimeString('zh-CN', { hour12: false })
    return `已同步 ${time}`
  }
  return '改动将自动同步'
})

const syncError = computed(() => Boolean(meta.error))

onMounted(async () => {
  await siteContent.loadAdmin()
  if (!state.pages.some((page) => page.id === activePageId.value)) {
    activePageId.value = state.pages[0]?.id ?? ''
  }
})

/**
 * 内容编辑器区域右键。
 *
 * 输入框里的"剪切/复制/粘贴"由全局可编辑区菜单负责，这里补的是**编辑器级别**的操作：
 * 复制当前页配置、复制整份站点配置、重新从服务端载入（放弃本地未同步改动）。
 */
function editorContextMenu(): ContextMenuItem[] {
  const page = state.pages.find((item) => item.id === activePageId.value)
  return [
    {
      key: 'copy-page',
      label: '复制当前页配置（JSON）',
      icon: 'copy',
      disabled: !page,
      onSelect: () => void navigator.clipboard?.writeText(JSON.stringify(page ?? {}, null, 2)).catch(() => {}),
    },
    {
      key: 'copy-site',
      label: '复制整份站点配置（JSON）',
      icon: 'export',
      onSelect: () => void navigator.clipboard?.writeText(JSON.stringify(state, null, 2)).catch(() => {}),
    },
    {
      key: 'reload',
      label: '从服务端重新载入',
      icon: 'refresh',
      divider: true,
      onSelect: () => void siteContent.loadAdmin(),
    },
  ]
}

function onEditorContextMenu(event: MouseEvent): void {
  const target = event.target
  // 输入框内保留浏览器/输入法自身的编辑能力，只有非输入区才弹编辑器菜单
  if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return
  event.preventDefault()
  openContextMenu({ x: event.clientX, y: event.clientY, items: editorContextMenu(), opener: null })
}

function addSection(page: ContentPage): void {
  page.sections.push(createSection())
}

function removeSection(page: ContentPage, index: number): void {
  page.sections.splice(index, 1)
}

function addElement(section: ContentPage['sections'][number], type: ContentElementType): void {
  const el = createElement(type)
  if (type === 'hero' || type === 'links') el.items.push(createItem())
  section.elements.push(el)
}

function removeElement(section: ContentPage['sections'][number], index: number): void {
  section.elements.splice(index, 1)
}

function addItem(el: ContentElement): void {
  el.items.push(createItem())
}

function removeItem(el: ContentElement, index: number): void {
  el.items.splice(index, 1)
}

/* -------------------------------- 拖拽排序 ------------------------------- */

type DragKind = 'section' | 'element'

interface DragState {
  kind: DragKind
  /** 所属区块 id（元素级拖拽时用于限定同区块内排序） */
  sectionId: string
  /** 被拖拽项的 id */
  id: string
}

const dragging = ref<DragState | null>(null)

/** 跟随光标的「完整组件」虚影（由被拖拽项 DOM 克隆而来） */
let ghostEl: HTMLElement | null = null
let ghostOffsetX = 0
let ghostOffsetY = 0

/** 1×1 透明替身：屏蔽浏览器默认的整块快照，改由自定义虚影反馈 */
let dragImageProxy: HTMLElement | null = null
function getDragImageProxy(): HTMLElement {
  if (!dragImageProxy) {
    dragImageProxy = document.createElement('div')
    dragImageProxy.style.cssText = 'position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0;'
    document.body.appendChild(dragImageProxy)
  }
  return dragImageProxy
}

function moveGhost(event: DragEvent): void {
  if (!ghostEl) return
  ghostEl.style.left = `${event.clientX - ghostOffsetX}px`
  ghostEl.style.top = `${event.clientY - ghostOffsetY}px`
}

function removeGhost(): void {
  ghostEl?.remove()
  ghostEl = null
}

/** 记录拖拽起点：仅手柄触发拖动，避免干扰输入框内选中文本；克隆出完整组件虚影跟随光标 */
function onDragStart(event: DragEvent, kind: DragKind, sectionId: string, id: string): void {
  const handle = event.currentTarget as HTMLElement
  const item = handle.closest<HTMLElement>(kind === 'section' ? '.editor-section' : '.editor-element')
  dragging.value = { kind, sectionId, id }

  if (item) {
    const rect = item.getBoundingClientRect()
    ghostOffsetX = event.clientX - rect.left
    ghostOffsetY = event.clientY - rect.top
    const clone = item.cloneNode(true) as HTMLElement
    clone.classList.add('editor-drag-ghost')
    clone.style.width = `${rect.width}px`
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    document.body.appendChild(clone)
    ghostEl = clone
  }

  window.addEventListener('dragover', moveGhost)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.setDragImage(getDragImageProxy(), 0, 0)
  }
}

function onDragEnd(): void {
  dragging.value = null
  removeGhost()
  window.removeEventListener('dragover', moveGhost)
}

/**
 * 依据光标位置实时计算插入位并就地移动（占位让位）。
 *
 * 使用 `offsetTop` / `offsetHeight` 读取布局坐标，避免 FLIP 过渡中的 `transform`
 * 干扰命中判定，从而杜绝「抖动 / 跳变」。
 */
function moveByPointer<T extends { id: string }>(
  list: T[],
  container: HTMLElement,
  dragId: string,
  pointerY: number,
): void {
  const from = list.findIndex((item) => item.id === dragId)
  if (from === -1) return
  const items = Array.from(container.children) as HTMLElement[]
  const y = pointerY - container.getBoundingClientRect().top
  let target = items.length
  for (let i = 0; i < items.length; i += 1) {
    if (y < items[i].offsetTop + items[i].offsetHeight / 2) {
      target = i
      break
    }
  }
  if (target > from) target -= 1
  if (target === from || target < 0) return
  const [moved] = list.splice(from, 1)
  list.splice(target, 0, moved)
}

function onSectionDragOver(event: DragEvent, page: ContentPage | undefined): void {
  const current = dragging.value
  if (!current || current.kind !== 'section' || !page) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const container = (event.currentTarget as HTMLElement).parentElement
  if (container) moveByPointer(page.sections, container, current.id, event.clientY)
}

function onElementDragOver(event: DragEvent, section: ContentPage['sections'][number]): void {
  const current = dragging.value
  // 元素级排序仅允许发生在同一区块内
  if (!current || current.kind !== 'element' || current.sectionId !== section.id) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const container = (event.currentTarget as HTMLElement).parentElement
  if (container) moveByPointer(section.elements, container, current.id, event.clientY)
}

/** 放置：排序已在 dragover 中实时完成，这里仅阻止默认行为并收尾 */
function onDrop(event: DragEvent): void {
  event.preventDefault()
  onDragEnd()
}

function fieldsOf(type: ContentElementType) {
  return ITEM_FIELDS[type]
}

function tagsValue(item: ContentItem): string {
  return (item.tags ?? []).join(', ')
}

function onTagsInput(item: ContentItem, raw: string): void {
  const tags = raw
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
  item.tags = tags.length ? tags : undefined
}

function onStatusInput(item: ContentItem, value: string): void {
  item.status = value ? (value as ContentItemStatus) : undefined
}

/** 服务节点：状态接口地址（空串归一为 undefined，交由取数逻辑回退静态状态） */
function onStatusUrlInput(target: { statusUrl?: string }, value: string): void {
  target.statusUrl = value ? value : undefined
}

/** 服务状态图：轮询间隔（秒），空值归一为 undefined（使用默认 30s） */
function onIntervalInput(el: ContentElement, value: number | null): void {
  el.statusIntervalSeconds = value == null ? undefined : value
}

/* --------------------------------- 新增页面 -------------------------------- */

const createVisible = ref(false)
const createForm = reactive({ title: '', path: '', nav: true, template: 'blank' })

const templateOptions = [
  { label: '空白页', value: 'blank' },
  { label: '标准页（Hero + 文本）', value: 'standard' },
]

function openCreatePage(): void {
  createForm.title = ''
  createForm.path = ''
  createForm.nav = true
  createForm.template = 'blank'
  createVisible.value = true
}

function confirmCreatePage(): void {
  const title = createForm.title.trim()
  const path = siteContent.normalizePath(createForm.path || '/')
  if (!title) {
    message.warning('请填写页面标题')
    return
  }
  if (state.pages.some((page) => siteContent.normalizePath(page.path) === path)) {
    message.warning(`路径「${path}」已被占用`)
    return
  }
  const page = createPage(title, path, createForm.nav, createForm.template === 'standard')
  siteContent.addPage(page)
  activePageId.value = page.id
  createVisible.value = false
  message.success('页面已创建')
}

function confirmRemovePage(page: ContentPage): void {
  dialog.warning({
    title: '删除页面',
    content: `确认删除页面「${page.title}」（${page.path}）？该操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      siteContent.removePage(page.id)
      activePageId.value = state.pages[0]?.id ?? ''
      message.success('页面已删除')
    },
  })
}

/* ------------------------------ 重置 / 导入导出 ----------------------------- */

const exportVisible = ref(false)
const importVisible = ref(false)
const exportText = ref('')
const importText = ref('')

function openExport(): void {
  exportText.value = siteContent.exportJson()
  exportVisible.value = true
}

async function copyExport(): Promise<void> {
  try {
    await navigator.clipboard.writeText(exportText.value)
    message.success('已复制到剪贴板')
  } catch {
    message.warning('复制失败，请手动选择文本')
  }
}

function openImport(): void {
  importText.value = ''
  importVisible.value = true
}

function confirmImport(): void {
  try {
    siteContent.importJson(importText.value)
    activePageId.value = state.pages[0]?.id ?? ''
    importVisible.value = false
    message.success('内容已导入')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入失败：格式不正确')
  }
}

function confirmReset(): void {
  dialog.warning({
    title: '重置内容',
    content: '确认恢复为内置默认内容？当前所有自定义改动将被覆盖。',
    positiveText: '重置',
    negativeText: '取消',
    onPositiveClick: () => {
      siteContent.resetContent()
      activePageId.value = state.pages[0]?.id ?? ''
      message.success('已重置为默认内容')
    },
  })
}
</script>

<template>
  <page-container
    @contextmenu="onEditorContextMenu"
    title="门户内容"
    description="维护用户端门户的站点信息与页面内容；改动会保存到后端并对所有访客生效"
  >
    <template #extra>
      <span class="editor-sync" :class="{ 'is-error': syncError }">{{ syncText }}</span>
      <n-button quaternary @click="openExport">导出 JSON</n-button>
      <n-button quaternary @click="openImport">导入 JSON</n-button>
      <n-button quaternary @click="confirmReset">重置</n-button>
      <n-button type="primary" @click="openCreatePage">新增页面</n-button>
    </template>

    <!-- ------------------------------ 站点信息 ------------------------------ -->
    <section-card title="站点信息" description="用于门户顶栏、页脚与浏览器标题">
      <n-form label-placement="top" :show-feedback="false" class="editor-grid">
        <n-form-item label="站点名称">
          <n-input v-model:value="state.site.name" placeholder="YunaNexus" />
        </n-form-item>
        <n-form-item label="标语">
          <n-input v-model:value="state.site.tagline" placeholder="一句话定位" />
        </n-form-item>
        <n-form-item label="版本">
          <n-input v-model:value="state.site.version" placeholder="0.1.0" />
        </n-form-item>
        <n-form-item label="仓库地址">
          <n-input v-model:value="state.site.repositoryUrl" placeholder="https://..." />
        </n-form-item>
        <n-form-item label="页脚说明">
          <n-input v-model:value="state.site.footerNote" placeholder="Managed By ..." />
        </n-form-item>
      </n-form>
      <n-form label-placement="top" :show-feedback="false" class="editor-grid editor-grid--wide">
        <n-form-item label="站点描述">
          <n-input
            v-model:value="state.site.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="站点整体介绍"
          />
        </n-form-item>
      </n-form>
    </section-card>

    <!-- ------------------------------ 页面内容 ------------------------------ -->
    <section-card title="页面内容" description="页面 → 区块 → 元素 → 条目，逐级编辑">
      <template #extra>
        <span class="editor-count">{{ state.pages.length }} 个页面</span>
      </template>

      <n-empty v-if="!state.pages.length" description="暂无页面，请先新增" />

      <div v-else class="editor-pages">
        <nav class="editor-pages__nav">
          <button
            v-for="page in state.pages"
            :key="page.id"
            type="button"
            class="editor-pages__tab"
            :class="{ 'is-active': page.id === activePageId }"
            @click="activePageId = page.id"
          >
            <span class="editor-pages__tab-title">{{ page.title || '未命名' }}</span>
            <span class="editor-pages__tab-path">{{ page.path }}</span>
          </button>
        </nav>

        <div v-if="activePage" class="editor-pages__main">
          <!-- 页面元信息 -->
          <n-form label-placement="top" :show-feedback="false" class="editor-grid">
            <n-form-item label="页面标题">
              <n-input v-model:value="activePage.title" placeholder="页面标题" />
            </n-form-item>
            <n-form-item label="路由路径">
              <n-input v-model:value="activePage.path" placeholder="/about" />
            </n-form-item>
            <n-form-item label="导航显示">
              <n-switch v-model:value="activePage.nav">
                <template #checked>展示</template>
                <template #unchecked>隐藏</template>
              </n-switch>
            </n-form-item>
            <n-form-item label="页面描述">
              <n-input v-model:value="activePage.description" placeholder="用于导航提示与 SEO" />
            </n-form-item>
          </n-form>

          <div class="editor-actions">
            <n-button size="small" @click="addSection(activePage)">新增区块</n-button>
            <n-button size="small" quaternary type="error" @click="confirmRemovePage(activePage)">
              删除该页面
            </n-button>
          </div>

          <!-- 区块列表 -->
          <div v-if="!activePage.sections.length" class="editor-empty">该页面暂无区块</div>

          <transition-group
            v-else
            name="editor-list"
            tag="div"
            class="editor-sections"
          >
          <article
            v-for="(section, sIndex) in activePage.sections"
            :key="section.id"
            class="editor-section"
            :class="{ 'is-dragging': dragging?.kind === 'section' && dragging.id === section.id }"
            @dragover="(e) => onSectionDragOver(e, activePage)"
            @drop="onDrop"
          >
            <header class="editor-section__head">
              <span class="editor-section__label">
                <span
                  class="editor-drag-handle"
                  draggable="true"
                  title="按住拖动排序"
                  @dragstart="(e) => onDragStart(e, 'section', section.id, section.id)"
                  @dragend="onDragEnd"
                >
                  <n-icon :component="ReorderTwoOutline" />
                </span>
                <span class="editor-section__index">区块 {{ sIndex + 1 }}</span>
              </span>
              <n-button size="tiny" quaternary type="error" @click="removeSection(activePage, sIndex)">
                删除区块
              </n-button>
            </header>

            <n-form label-placement="top" :show-feedback="false" class="editor-grid">
              <n-form-item label="区块标题">
                <n-input v-model:value="section.title" placeholder="如：核心能力" />
              </n-form-item>
              <n-form-item label="区块描述">
                <n-input v-model:value="section.description" placeholder="可选" />
              </n-form-item>
            </n-form>

            <div class="editor-subhead">区块元素</div>

            <!-- 元素列表 -->
            <transition-group name="editor-list" tag="div" class="editor-elements">
            <div
              v-for="(el, eIndex) in section.elements"
              :key="el.id"
              class="editor-element"
              :class="{ 'is-dragging': dragging?.kind === 'element' && dragging.id === el.id }"
              @dragover="(e) => onElementDragOver(e, section)"
              @drop="onDrop"
            >
              <header class="editor-element__head">
                <span class="editor-element__label">
                  <span
                    class="editor-drag-handle"
                    draggable="true"
                    title="按住拖动排序"
                    @dragstart="(e) => onDragStart(e, 'element', section.id, el.id)"
                    @dragend="onDragEnd"
                  >
                    <n-icon :component="ReorderTwoOutline" />
                  </span>
                  <span class="editor-element__type">{{ ELEMENT_LABEL[el.type] }}</span>
                </span>
                <n-button size="tiny" quaternary type="error" @click="removeElement(section, eIndex)">
                  删除元素
                </n-button>
              </header>

              <n-form label-placement="top" :show-feedback="false" class="editor-grid">
                <n-form-item v-if="el.type !== 'divider'" label="元素标题">
                  <n-input v-model:value="el.title" placeholder="可选" />
                </n-form-item>
                <n-form-item label="元素正文">
                  <n-input
                    v-model:value="el.text"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 5 }"
                    placeholder="可选"
                  />
                </n-form-item>
              </n-form>

              <!-- 服务状态图：聚合接口 + 轮询间隔 -->
              <n-form
                v-if="el.type === 'services'"
                label-placement="top"
                :show-feedback="false"
                class="editor-grid editor-services-config"
              >
                <n-form-item label="聚合状态接口（可选）">
                  <n-input
                    :value="el.statusUrl ?? ''"
                    placeholder="如 /api/v1/status，留空则逐个使用各服务地址"
                    @update:value="(v) => onStatusUrlInput(el, v as string)"
                  />
                </n-form-item>
                <n-form-item label="轮询间隔（秒）">
                  <n-input-number
                    :value="el.statusIntervalSeconds ?? null"
                    :min="5"
                    :max="3600"
                    :step="5"
                    placeholder="默认 30，最小 5"
                    style="width: 100%"
                    @update:value="(v) => onIntervalInput(el, v as number | null)"
                  />
                </n-form-item>
              </n-form>

              <!-- 条目列表 -->
              <div v-if="ITEM_FIELDS[el.type].title || ITEM_FIELDS[el.type].number" class="editor-items">
                <div v-for="(item, iIndex) in el.items" :key="item.id" class="editor-item">
                  <div class="editor-item__fields">
                    <n-input
                      v-if="fieldsOf(el.type).title"
                      v-model:value="item.title"
                      size="small"
                      :placeholder="titlePlaceholder(el.type)"
                    />
                    <template v-if="fieldsOf(el.type).number">
                      <n-input v-model:value="item.value" size="small" placeholder="数值" />
                      <n-input v-model:value="item.unit" size="small" placeholder="单位" class="is-narrow" />
                    </template>
                    <n-input
                      v-if="fieldsOf(el.type).text"
                      v-model:value="item.text"
                      size="small"
                      placeholder="条目描述"
                    />
                    <n-select
                      v-if="fieldsOf(el.type).status"
                      :value="item.status ?? ''"
                      size="small"
                      :options="statusOptionsOf(el.type)"
                      class="is-narrow"
                      @update:value="(v) => onStatusInput(item, v as string)"
                    />
                    <n-input
                      v-if="el.type === 'services'"
                      :value="item.statusUrl ?? ''"
                      size="small"
                      placeholder="该服务状态地址（可选）"
                      @update:value="(v) => onStatusUrlInput(item, v as string)"
                    />
                    <n-input
                      v-if="fieldsOf(el.type).link"
                      v-model:value="item.link"
                      size="small"
                      placeholder="链接（/ 站内或 https://）"
                    />
                    <n-input
                      v-if="fieldsOf(el.type).tags"
                      :value="tagsValue(item)"
                      size="small"
                      placeholder="标签，逗号分隔"
                      @update:value="(v) => onTagsInput(item, v as string)"
                    />
                  </div>
                  <n-button size="tiny" quaternary type="error" @click="removeItem(el, iIndex)">
                    删除
                  </n-button>
                </div>

                <n-button size="tiny" dashed @click="addItem(el)">新增条目</n-button>
              </div>
            </div>
            </transition-group>

            <div class="editor-element__adder">
              <n-select
                :value="null"
                size="small"
                placeholder="新增元素"
                :options="ELEMENT_TYPES"
                style="width: 180px"
                @update:value="(v) => addElement(section, v as ContentElementType)"
              />
            </div>
          </article>
          </transition-group>
        </div>
      </div>
    </section-card>

    <!-- ------------------------------ 实时预览 ------------------------------ -->
    <section-card v-if="activePage" title="预览" description="与用户端门户一致的渲染效果">
      <div class="editor-preview">
        <content-renderer
          v-for="section in activePage.sections"
          :key="section.id"
          :section="section"
        />
      </div>
    </section-card>

    <!-- ------------------------------ 新增页面弹窗 ---------------------------- -->
    <n-modal
      v-model:show="createVisible"
      preset="card"
      title="新增页面"
      style="max-width: 460px"
      :bordered="false"
    >
      <n-form label-placement="top" :show-feedback="false">
        <n-form-item label="页面标题">
          <n-input v-model:value="createForm.title" placeholder="如：MaiTTx" />
        </n-form-item>
        <n-form-item label="路由路径">
          <n-input v-model:value="createForm.path" placeholder="如 /maittx" />
        </n-form-item>
        <n-form-item label="初始模板">
          <n-select v-model:value="createForm.template" :options="templateOptions" />
        </n-form-item>
        <n-form-item label="在导航中显示">
          <n-switch v-model:value="createForm.nav" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="editor-modal__foot">
          <n-button quaternary @click="createVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmCreatePage">创建</n-button>
        </div>
      </template>
    </n-modal>

    <!-- ------------------------------ 导出弹窗 ------------------------------- -->
    <n-modal
      v-model:show="exportVisible"
      preset="card"
      title="导出内容"
      style="max-width: 640px"
      :bordered="false"
    >
      <n-input v-model:value="exportText" type="textarea" :autosize="{ minRows: 10, maxRows: 18 }" readonly />
      <template #footer>
        <div class="editor-modal__foot">
          <n-button quaternary @click="exportVisible = false">关闭</n-button>
          <n-button type="primary" @click="copyExport">复制</n-button>
        </div>
      </template>
    </n-modal>

    <!-- ------------------------------ 导入弹窗 ------------------------------- -->
    <n-modal
      v-model:show="importVisible"
      preset="card"
      title="导入内容"
      style="max-width: 640px"
      :bordered="false"
    >
      <n-input
        v-model:value="importText"
        type="textarea"
        :autosize="{ minRows: 10, maxRows: 18 }"
        placeholder="粘贴导出的 JSON 内容"
      />
      <template #footer>
        <div class="editor-modal__foot">
          <n-button quaternary @click="importVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmImport">导入</n-button>
        </div>
      </template>
    </n-modal>
  </page-container>
</template>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.editor-grid--wide {
  margin-top: 16px;
  grid-template-columns: minmax(0, 1fr);
}

.editor-count {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.editor-sync {
  margin-right: 4px;
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.editor-sync.is-error {
  color: var(--yuna-danger);
}

/* ------------------------------- 页面切换 ------------------------------- */

.editor-pages {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
}

.editor-pages__nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editor-pages__tab {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.editor-pages__tab:hover {
  background: var(--yuna-gray-100);
}

.editor-pages__tab.is-active {
  background: var(--yuna-blue-50);
}

.editor-pages__tab-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.editor-pages__tab.is-active .editor-pages__tab-title {
  color: var(--yuna-primary);
}

.editor-pages__tab-path {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.editor-pages__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--yuna-gray-600);
  text-align: center;
  background: var(--yuna-gray-50);
  border-radius: var(--yuna-radius-md);
}

/* -------------------------------- 区块 -------------------------------- */

.editor-section {
  padding: 16px;
  background: var(--yuna-gray-50);
  border-radius: var(--yuna-radius-lg);
}

.editor-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.editor-section__index {
  font-size: 13px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

/* ------------------------------ 拖拽手柄与反馈 ----------------------------- */

.editor-section__label,
.editor-element__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.editor-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--yuna-gray-500);
  cursor: grab;
  user-select: none;
  transition: color 0.15s ease;
}

.editor-drag-handle:hover {
  color: var(--yuna-primary);
}

.editor-drag-handle:active {
  cursor: grabbing;
}

.editor-sections {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-elements {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* FLIP 让位动画：拖拽经过时其余项平滑位移，不做跳变 */
.editor-list-move {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 被拖拽项本身作为「落位占位」：半透明 + 虚线框，随排序实时移动 */
.editor-section.is-dragging,
.editor-element.is-dragging {
  opacity: 0.38;
  outline: 2px dashed var(--yuna-primary);
  outline-offset: -2px;
}

/* 区块元信息与元素编辑区之间的分隔 */
.editor-subhead {
  margin: 16px 0 10px;
  padding-top: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--yuna-gray-600);
  border-top: 1px solid var(--yuna-gray-200);
}

.editor-element {
  padding: 14px;
  margin-bottom: 12px;
  background: var(--yuna-surface);
  border: 1px solid var(--yuna-gray-200);
  border-radius: var(--yuna-radius-md);
}

.editor-element__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.editor-element__type {
  padding: 1px 8px;
  font-size: 12px;
  color: var(--yuna-blue-700);
  background: var(--yuna-blue-50);
  border-radius: 999px;
}

.editor-element__adder {
  margin-top: 4px;
}

/* -------------------------------- 条目 -------------------------------- */

.editor-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.editor-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.editor-item__fields {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-item__fields > * {
  flex: 1 1 160px;
  min-width: 0;
}

.editor-item__fields .is-narrow {
  flex: 0 0 110px;
}

/* -------------------------------- 预览 -------------------------------- */

.editor-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 860px) {
  .editor-pages {
    grid-template-columns: minmax(0, 1fr);
  }

  .editor-pages__nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

/* --------------------- 拖拽虚影（完整组件克隆，跟随光标） --------------------- */

.editor-drag-ghost {
  position: fixed;
  z-index: 3000;
  margin: 0;
  padding: 16px;
  pointer-events: none;
  opacity: 0.9;
  background: var(--yuna-surface);
  border: 1px solid var(--yuna-blue-300);
  border-radius: var(--yuna-radius-lg);
  box-shadow:
    0 18px 44px rgba(15, 23, 42, 0.22),
    0 2px 8px rgba(15, 23, 42, 0.12);
  transform: rotate(1.2deg) scale(1.01);
  transform-origin: center;
  transition: none;
  will-change: left, top;
}
</style>
