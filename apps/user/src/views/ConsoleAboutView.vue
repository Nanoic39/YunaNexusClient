<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NResult } from 'naive-ui'
import { ContentRenderer, PageContainer } from '@yuna/ui'
import { siteContent } from '@yuna/core'

/**
 * 控制台「关于」页：复用门户 `/about` 的内容数据（siteContent）。
 *
 * 内容由管理端门户编辑器统一维护，控制台与门户保持一致，避免两处重复定义。
 */
const router = useRouter()

const page = computed(() => siteContent.findPage('/about'))

function navigate(path: string): void {
  void router.push(path)
}
</script>

<template>
  <page-container title="关于" description="了解平台的定位、技术选型与开发进度">
    <template v-if="page">
      <content-renderer
        v-for="section in page.sections"
        :key="section.id"
        :section="section"
        @navigate="navigate"
      />
    </template>
    <n-result v-else status="404" title="内容不存在" description="关于页内容尚未配置。" />
  </page-container>
</template>
