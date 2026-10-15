<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { noticeApi } from '@yuna/core'
import type { NoticeRecordView } from '@yuna/core'
import { formatRelative } from '../utils/format'

/**
 * 顶栏通知按钮：铃铛 + 未读徽标 + 磨砂浮层面板。
 *
 * 交互设计：
 * - 打开面板时先保持收缩态，数据就绪后再平滑展开（不出现「先收缩再展开」的抖动）；
 * - 点击任意通知 → 直接进入该条通知的详情页（不再有单独的「查看详情」入口）；
 * - Hover 正文被截断（超长）的通知 → 左侧浮出可滚动的侧边预览卡；短通知不浮出，避免信息重复；
 * - 「全部已读」→ 一键清空未读；
 * - 「查看全部通知」→ 抛出 `open` 事件（无 id）跳转站内信列表页。
 *
 * 面板高度随内容（加载中 / 空态 / 列表）平滑过渡，避免数据到位后的突兀跳变。
 * 数据源为站内信收件箱（`noticeApi.inbox`），未读判定为 `status !== 3`。
 */
interface Props {
  /** 面板最多展示的条数 */
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 6,
})

const emit = defineEmits<{
  (e: 'read', noticeId: number): void
  (e: 'open', noticeId?: number): void
}>()

/** 面板主体最大高度，同时用于预留给滚动与高度测量钳制 */
const BODY_MAX_HEIGHT = 360
/** 侧边预览卡固定宽度 */
const PREVIEW_WIDTH = 300
/** 预览卡与面板之间的水平间距 */
const PREVIEW_GAP = 10

const open = ref(false)
const loading = ref(false)
const notices = ref<NoticeRecordView[]>([])

const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const bodyInnerRef = ref<HTMLElement | null>(null)
/** 面板主体的显式高度：打开时先置 0（收缩态），数据就绪后再测量并过渡展开 */
const bodyHeight = ref<string>('0px')

/** 当前 Hover 的通知（驱动侧边预览卡） */
const hovered = ref<NoticeRecordView | null>(null)
const previewStyle = ref<Record<string, string>>({})
/** 延迟隐藏预览卡的定时器，用于让指针从条目平移到预览卡时不被中断 */
let hideTimer: number | undefined

const unread = computed(() => notices.value.filter((item) => item.status !== 3))
const unreadCount = computed(() => unread.value.length)
const badge = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))
const visible = computed(() => notices.value.slice(0, props.limit))

/** 测量内容自然高度（钳制到上限），交由 `.ntf__body` 过渡 */
function syncBodyHeight(): void {
  const inner = bodyInnerRef.value
  if (!inner) return
  bodyHeight.value = `${Math.min(inner.scrollHeight, BODY_MAX_HEIGHT)}px`
}

async function load(): Promise<void> {
  loading.value = true
  try {
    notices.value = (await noticeApi.inbox()).records
  } catch {
    /* 未登录 / 接口不可用时保持空列表，徽标不展示 */
  } finally {
    loading.value = false
  }
}

function toggle(): void {
  if (open.value) {
    close()
    return
  }
  open.value = true
  hovered.value = null
  // 需求 1：以收缩态出现，加载完成后由 watch 测量高度过渡展开，避免「先收缩再展开」
  bodyHeight.value = '0px'
  void load()
}

function close(): void {
  open.value = false
  hovered.value = null
  cancelHide()
}

async function markAllRead(): Promise<void> {
  const targets = unread.value.slice()
  targets.forEach((item) => {
    item.status = 3
    emit('read', item.noticeId)
  })
  await Promise.all(
    targets.map((item) =>
      noticeApi.markRead(item.noticeId).catch(() => {
        item.status = 1
      }),
    ),
  )
}

/** 跳转独立页面查看（可选定位到某条通知） */
function openPage(noticeId?: number): void {
  close()
  emit('open', noticeId)
}

function onRowEnter(event: MouseEvent, item: NoticeRecordView): void {
  cancelHide()
  const row = event.currentTarget as HTMLElement
  // 需求 7：正文未被截断（短通知）时，面板内已完整展示，无需再浮出预览卡
  const text = row.querySelector<HTMLElement>('.ntf__item-text')
  if (!isTruncated(text)) {
    hovered.value = null
    return
  }
  hovered.value = item
  // 条目已在 DOM 中，可同步测量并写入位置，避免预览卡在旧坐标闪现
  positionPreview(row)
}

/** 判断文本是否被 `-webkit-line-clamp` 截断（scrollHeight 大于可视高度即被裁切） */
function isTruncated(el: HTMLElement | null): boolean {
  if (!el) return false
  return el.scrollHeight > el.clientHeight + 1
}

/** 离开条目后延迟收敛，留出指针平移到预览卡的容错时间 */
function scheduleHide(): void {
  cancelHide()
  hideTimer = window.setTimeout(() => {
    hovered.value = null
  }, 140)
}

function cancelHide(): void {
  if (hideTimer !== undefined) {
    window.clearTimeout(hideTimer)
    hideTimer = undefined
  }
}

/** 将预览卡定位到被 Hover 行的左侧；空间不足时翻转到面板右侧 */
function positionPreview(row: HTMLElement): void {
  const root = rootRef.value
  const panel = panelRef.value
  if (!root || !panel) return
  const rootRect = root.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const rowRect = row.getBoundingClientRect()
  const top = rowRect.top - rootRect.top
  const leftOfPanel = panelRect.left - rootRect.left - PREVIEW_WIDTH - PREVIEW_GAP
  const left =
    panelRect.left - PREVIEW_WIDTH - PREVIEW_GAP < 8
      ? panelRect.right - rootRect.left + PREVIEW_GAP
      : leftOfPanel
  previewStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${PREVIEW_WIDTH}px`,
  }
}

function onDocPointerDown(event: MouseEvent): void {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

/** 内容变化后重新测量高度，触发平滑过渡而非跳变；加载中保持收缩态不测量 */
watch(
  [loading, visible],
  () => {
    if (loading.value) return
    syncBodyHeight()
  },
  { flush: 'post' },
)

onMounted(() => {
  void load()
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="ntf">
    <button
      type="button"
      class="ntf__trigger"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      aria-haspopup="dialog"
      title="通知"
      aria-label="通知"
      @click="toggle"
      @contextmenu.prevent="toggle"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
        <path
          d="M10.3 19a2 2 0 0 0 3.4 0"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
      <span v-if="unreadCount" class="ntf__badge">{{ badge }}</span>
    </button>

    <Transition name="ntf-pop">
      <div v-if="open" ref="panelRef" class="ntf__panel" role="dialog" aria-label="通知">
        <div class="ntf__head">
          <span class="ntf__title">通知</span>
          <button
            type="button"
            class="ntf__action"
            :disabled="!unreadCount"
            @click="markAllRead"
          >
            全部已读
          </button>
        </div>

        <div class="ntf__body" :style="{ height: bodyHeight }">
          <div ref="bodyInnerRef" class="ntf__body-inner">
            <p v-if="loading" class="ntf__hint">加载中…</p>
            <p v-else-if="!visible.length" class="ntf__hint">暂无通知</p>
            <ul v-else class="ntf__list">
              <li
                v-for="(item, index) in visible"
                :key="item.id"
                class="ntf__row"
                :style="{ animationDelay: `${index * 24}ms` }"
                @mouseenter="onRowEnter($event, item)"
                @mouseleave="scheduleHide"
              >
                <button
                  type="button"
                  class="ntf__item"
                  :class="{ 'is-unread': item.status !== 3 }"
                  @click="openPage(item.noticeId)"
                >
                  <span class="ntf__dot" aria-hidden="true" />
                  <span class="ntf__main">
                    <span class="ntf__item-title">{{ item.title || '通知' }}</span>
                    <span class="ntf__item-text">{{ item.content || '' }}</span>
                    <span class="ntf__item-time">
                      {{ formatRelative(item.sendTime ?? item.createTime) }}
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="ntf__foot">
          <button type="button" class="ntf__more" @click="openPage()">查看全部通知</button>
        </div>
      </div>
    </Transition>

    <!-- 侧边预览卡：置于面板外，避免被其 overflow / backdrop-filter 裁剪 -->
    <Transition name="ntf-preview">
      <div
        v-if="hovered"
        class="ntf__preview"
        :style="previewStyle"
        role="tooltip"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <div class="ntf__preview-head">
          <span class="ntf__preview-title">{{ hovered.title || '通知' }}</span>
          <span class="ntf__preview-time">
            {{ formatRelative(hovered.sendTime ?? hovered.createTime) }}
          </span>
        </div>
        <p class="ntf__preview-body">{{ hovered.content || '（无正文）' }}</p>
        <div class="ntf__preview-foot">
          <span>{{ hovered.channelLabel || '站内信' }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ntf {
  position: relative;
}

.ntf__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--yuna-gray-600);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.ntf__trigger:hover,
.ntf__trigger.is-open {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.ntf__badge {
  position: absolute;
  top: 3px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  color: #ffffff;
  text-align: center;
  background: var(--yuna-danger);
  border: 1.5px solid var(--yuna-surface);
  border-radius: 999px;
}

/* 磨砂浮层：统一走 --yuna-glass-* 令牌，与账号菜单保持一致的玻璃质感 */
.ntf__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  background: var(--yuna-glass);
  border: 1px solid var(--yuna-glass-border);
  border-radius: 16px;
  box-shadow: var(--yuna-glass-shadow);
  transform-origin: top right;
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.ntf__head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;
}

.ntf__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.ntf__action {
  padding: 0;
  font-size: 12px;
  color: var(--yuna-primary);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: opacity 0.15s ease;
}

.ntf__action:disabled {
  color: var(--yuna-gray-500);
  cursor: default;
}

/* 高度过渡：内容（加载中 / 空态 / 列表）切换时平滑伸缩，避免突兀跳变 */
.ntf__body {
  overflow: hidden;
  transition: height 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.ntf__body-inner {
  max-height: 360px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.ntf__hint {
  padding: 28px 14px;
  font-size: 13px;
  color: var(--yuna-gray-600);
  text-align: center;
}

.ntf__list {
  margin: 0;
  padding: 0 6px 6px;
  list-style: none;
}

.ntf__row {
  animation: ntf-entry-in 0.24s ease backwards;
}

.ntf__item {
  display: flex;
  gap: 9px;
  width: 100%;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.ntf__item:hover {
  background: var(--yuna-gray-100);
}

.ntf__dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  background: transparent;
  border-radius: 50%;
}

.ntf__item.is-unread .ntf__dot {
  background: var(--yuna-primary);
}

.ntf__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ntf__item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.ntf__item-text {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--yuna-gray-700);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.ntf__item-time {
  margin-top: 2px;
  font-size: 11px;
  color: var(--yuna-gray-500);
}

.ntf__foot {
  flex: 0 0 auto;
  padding: 6px;
  border-top: 1px solid var(--yuna-gray-200);
}

.ntf__more {
  width: 100%;
  height: 34px;
  font-size: 12.5px;
  color: var(--yuna-gray-700);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.ntf__more:hover {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

/* 侧边预览卡：与面板同一套磨砂令牌，自右侧滑入 */
.ntf__preview {
  position: absolute;
  z-index: 21;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 24px);
  padding: 12px 14px;
  background: var(--yuna-glass);
  border: 1px solid var(--yuna-glass-border);
  border-radius: 14px;
  box-shadow: var(--yuna-glass-shadow);
  transform-origin: right center;
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.ntf__preview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.ntf__preview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.ntf__preview-time {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--yuna-gray-500);
}

/* 需求 6：超长正文在预览卡内滚动，卡片本身不超过视口高度 */
.ntf__preview-body {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 320px;
  overflow-y: auto;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--yuna-gray-700);
  word-break: break-word;
  white-space: pre-wrap;
  overscroll-behavior: contain;
}

.ntf__preview-foot {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  font-size: 11px;
  color: var(--yuna-gray-500);
}

.ntf-pop-enter-active {
  animation: ntf-pop-in 0.26s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.ntf-pop-leave-active {
  animation: ntf-pop-out 0.15s ease-in both;
}

.ntf-preview-enter-active {
  transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.ntf-preview-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.ntf-preview-enter-from,
.ntf-preview-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.98);
}

@keyframes ntf-pop-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-6px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes ntf-pop-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  to {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
}

@keyframes ntf-entry-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

/* 窄屏：通知按钮右侧还有主题切换 / 头像，若仍以按钮右缘为锚点向左展开，面板会顶出屏幕左边界。
   故改为相对视口定位（fixed），始终贴合屏幕右侧并限制宽度；触屏无「悬停」语义，隐藏侧边预览卡 */
@media (max-width: 768px) {
  .ntf__panel {
    position: fixed;
    top: calc(var(--yuna-header-height) + 6px);
    right: 10px;
    left: auto;
    width: min(92vw, 340px);
  }

  .ntf__preview {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ntf__panel,
  .ntf__body,
  .ntf__preview,
  .ntf__row,
  .ntf__trigger {
    transition: none;
    animation-duration: 0.01ms;
  }
}
</style>
