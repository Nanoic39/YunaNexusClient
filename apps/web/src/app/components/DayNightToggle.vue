<script setup lang="ts">
/**
 * 日夜切换。
 *
 * 左键：在明暗之间切换。
 * 右键：给出「浅色 / 深色 / 跟随系统」三个明确选项——
 *       只有左键时用户无法表达"跟随系统"这个意图，右键菜单补齐。
 */
import { computed, onUnmounted } from 'vue'
import { displayMode } from '@yuna/theme'
import { Icon, registerContextMenuProvider, vContextMenu, type ContextMenuItem } from '@yuna/ui'

const night = computed(() => displayMode.resolved.value === 'dark')
const label = computed(() => (night.value ? '切换至日间模式' : '切换至夜间模式'))

const off = registerContextMenuProvider('appearance-toggle', () => {
  const mode = displayMode.mode.value
  const items: ContextMenuItem[] = [
    { key: 'light', label: '浅色模式', checked: mode === 'light', onSelect: () => displayMode.setMode('light') },
    { key: 'dark', label: '深色模式', checked: mode === 'dark', onSelect: () => displayMode.setMode('dark') },
    { key: 'sep', divider: true },
    { key: 'auto', label: '跟随系统', checked: mode === 'auto', onSelect: () => displayMode.setMode('auto') },
  ]
  return items
})
onUnmounted(off)
</script>

<template>
  <button
    v-context-menu="{ kind: 'appearance-toggle' }"
    type="button"
    class="workspace-button quiet workspace-icon-button"
    :title="label"
    :aria-label="label"
    :aria-pressed="night"
    @click="displayMode.setMode(night ? 'light' : 'dark')"
  >
    <Icon :name="night ? 'sun' : 'moon'" />
  </button>
</template>
