<script setup lang="ts">
import { computed } from 'vue'
import { displayMode } from '@yuna/theme'
import { Icon } from '@yuna/ui'
const night = computed(() => displayMode.resolved.value === 'dark')
const label = computed(() => (night.value ? '切换至日间模式' : '切换至夜间模式'))
</script>
<template>
  <button
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
