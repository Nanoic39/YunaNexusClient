<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="yuna-fallback">
    <n-result status="404" title="页面不存在" description="你访问的页面可能已被移除或地址有误。">
      <template #footer>
        <n-button @click="router.replace('/overview')">返回概览</n-button>
      </template>
    </n-result>
  </div>
</template>
