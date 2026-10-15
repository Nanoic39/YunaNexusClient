<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NResult } from 'naive-ui'
import { ContentRenderer } from '@yuna/ui'
import { siteContent } from '@yuna/core'

/**
 * 内容页：按当前路由从 `siteContent` 解析页面并渲染其区块。
 *
 * 首页（`/`）、关于页（`/about`）与后续通过管理端新增的自定义页面均复用本视图，
 * 页面内容完全由数据描述，新增页面无需改动前端路由。
 */
const route = useRoute()
const router = useRouter()

const page = computed(() => siteContent.findPage(route.path))

function navigate(path: string): void {
  if (path !== route.path) void router.push(path)
}
</script>

<template>
  <div v-if="page" class="content-page yuna-container">
    <content-renderer
      v-for="section in page.sections"
      :key="section.id"
      :section="section"
      @navigate="navigate"
    />
  </div>

  <div v-else class="content-page content-page--empty yuna-container">
    <n-result status="404" title="页面不存在" description="该页面可能已被移除，或地址有误。">
      <template #footer>
        <n-button @click="navigate('/')">返回首页</n-button>
      </template>
    </n-result>
  </div>
</template>

<style scoped>
.content-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px 24px 56px;
}

.content-page--empty {
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
