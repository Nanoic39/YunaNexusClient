<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NIcon } from 'naive-ui'
import type { Component } from 'vue'

/**
 * 顶栏账号菜单：头像 + 昵称触发，点开为浮层面板。
 *
 * 面板展开采用近似 iOS 上下文菜单的动效（自右上角缩放弹出 + 条目轻微错峰浮现），
 * 与导航外壳的顶栏配套使用；仅负责展示与选中事件，不感知业务语义。
 */
interface AccountMenuItem {
  key: string
  label: string
  icon?: Component
  /** 危险操作（如退出登录），以警示色呈现 */
  danger?: boolean
}

interface AccountMenuDivider {
  type: 'divider'
  key: string
}

type AccountMenuEntry = AccountMenuItem | AccountMenuDivider

interface Props {
  /** 展示名（昵称） */
  name: string
  /** 次级说明（可选，如角色 / 客户端） */
  subtitle?: string
  /** 头像文案，缺省取展示名首字 */
  avatar?: string
  avatarSrc?: string
  items: AccountMenuEntry[]
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  avatar: '',
})

const emit = defineEmits<{
  (e: 'select', key: string): void
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const initial = computed(() => props.avatar || props.name.trim().slice(0, 1).toUpperCase() || 'U')

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  open.value = false
}

function onSelect(entry: AccountMenuEntry): void {
  if ('type' in entry) return
  close()
  emit('select', entry.key)
}

function onDocPointerDown(event: MouseEvent): void {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="acct">
    <button
      type="button"
      class="acct__trigger"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
      @contextmenu.prevent="toggle"
    >
      <span class="acct__avatar" aria-hidden="true"
        ><img
          v-if="avatarSrc"
          :src="avatarSrc"
          alt=""
          style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit"
        /><template v-else>{{ initial }}</template></span
      >
      <span class="acct__id">
        <span class="acct__name">{{ name }}</span>
        <span v-if="subtitle" class="acct__sub">{{ subtitle }}</span>
      </span>
      <svg
        class="acct__chevron"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Transition name="acct-pop">
      <div v-if="open" class="acct__panel" role="menu">
        <ul class="acct__list">
          <template v-for="(entry, index) in items" :key="entry.key">
            <li
              v-if="'type' in entry"
              class="acct__divider"
              :style="{ animationDelay: `${index * 24}ms` }"
            />
            <li v-else class="acct__row" :style="{ animationDelay: `${index * 24}ms` }">
              <button
                type="button"
                class="acct__item"
                :class="{ 'is-danger': entry.danger }"
                role="menuitem"
                @click="onSelect(entry)"
              >
                <n-icon v-if="entry.icon" :component="entry.icon" :size="16" />
                <span>{{ entry.label }}</span>
              </button>
            </li>
          </template>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.acct {
  position: relative;
}

.acct__trigger {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 40px;
  padding: 0 8px 0 5px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-pill, 999px);
  transition: background-color 0.18s ease;
}

.acct__trigger:hover,
.acct__trigger.is-open {
  background: var(--yuna-gray-100);
}

.acct__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(
    135deg,
    var(--yuna-blue-700),
    var(--yuna-blue-500) 62%,
    var(--yuna-blue-400)
  );
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(29, 33, 41, 0.16);
}

.acct__id {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  line-height: 1.15;
}

.acct__name {
  max-width: 140px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: var(--yuna-gray-900);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.acct__sub {
  font-size: 11px;
  color: var(--yuna-gray-600);
}

.acct__chevron {
  flex: 0 0 auto;
  color: var(--yuna-gray-500);
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

.acct__trigger.is-open .acct__chevron {
  transform: rotate(180deg);
}

/* iOS 风格浮层：半透明磨砂 + 右上角缩放弹出，与通知面板共用 --yuna-glass-* 令牌 */
.acct__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  min-width: 208px;
  padding: 6px;
  background: var(--yuna-glass);
  border: 1px solid var(--yuna-glass-border);
  border-radius: 14px;
  box-shadow: var(--yuna-glass-shadow);
  transform-origin: top right;
  -webkit-backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
  backdrop-filter: saturate(180%) blur(var(--yuna-glass-blur));
}

.acct__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.acct__row,
.acct__divider {
  animation: acct-entry-in 0.24s ease backwards;
}

.acct__divider {
  height: 1px;
  margin: 5px 6px;
  background: var(--yuna-gray-200);
}

.acct__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--yuna-gray-800);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 9px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.acct__item:hover {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-100);
}

.acct__item.is-danger {
  color: var(--yuna-danger);
}

.acct__item.is-danger:hover {
  background: rgba(229, 72, 77, 0.08);
}

.acct-pop-enter-active {
  animation: acct-pop-in 0.26s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.acct-pop-leave-active {
  animation: acct-pop-out 0.15s ease-in both;
}

/* 进入：缩放 + 上浮；缓动带轻微回弹，贴近 iOS 面板展开手感 */
@keyframes acct-pop-in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-6px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes acct-pop-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  to {
    opacity: 0;
    transform: scale(0.96) translateY(-4px);
  }
}

/* 条目错峰浮现，强化「面板逐层展开」的观感 */
@keyframes acct-entry-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

/* 窄屏：顶栏空间有限，仅保留头像，收起昵称与箭头 */
@media (max-width: 768px) {
  .acct__trigger {
    gap: 0;
    padding: 0 5px;
  }

  .acct__id,
  .acct__chevron {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .acct__panel,
  .acct__row,
  .acct__divider,
  .acct__chevron {
    transition: none;
    animation-duration: 0.01ms;
  }
}
</style>
