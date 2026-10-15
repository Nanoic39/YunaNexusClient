<script setup lang="ts">
import { computed } from 'vue'
import { NTag } from 'naive-ui'
import type { StatusMeta, TagTone } from '../utils/status'

/**
 * 状态标签：把后端数值状态映射为固定色调的标签，避免各页面重复写 if/else。
 *
 * 两种用法：
 * - `:meta="userStatusMeta(row.status)"`：使用状态映射表（推荐）
 * - `tone="warning" text="待处理"`：直接给色调与文案
 */
interface Props {
  meta?: StatusMeta
  tone?: TagTone
  text?: string
  size?: 'small' | 'medium' | 'large'
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  bordered: false,
})

/** Naive 的标签类型用 `error` 表达危险态 */
const naiveType = computed(() => {
  const tone = props.meta?.tone ?? props.tone ?? 'default'
  return tone === 'danger' ? 'error' : tone
})

const label = computed(() => props.meta?.text ?? props.text ?? '')
</script>

<template>
  <n-tag :type="naiveType" :size="size" :bordered="bordered" round>{{ label }}</n-tag>
</template>
