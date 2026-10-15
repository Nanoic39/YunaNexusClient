<script setup lang="ts">
import { NEmpty } from 'naive-ui'

/**
 * 空态占位：统一「无数据 / 未开启」等场景的呈现。
 *
 * 默认插槽用于放置引导操作（如「去创建」按钮）。
 */
interface Props {
  description?: string
  size?: 'small' | 'medium' | 'large' | 'huge'
}

withDefaults(defineProps<Props>(), {
  description: '暂无数据',
  size: 'medium',
})
</script>

<template>
  <div class="yuna-empty">
    <n-empty :description="description" :size="size">
      <template v-if="$slots.default" #extra>
        <slot />
      </template>
    </n-empty>
  </div>
</template>

<style scoped>
.yuna-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
}
</style>
