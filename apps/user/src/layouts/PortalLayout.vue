<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { PortalShell } from '@yuna/ui'
import { session, siteContent } from '@yuna/core'

/**
 * 用户端「公开门户」布局。
 *
 * 承载首页 / 关于页 / 自定义内容页，无需登录即可访问；顶部导航由 `siteContent`
 * 中标记 `nav` 的页面驱动，可随管理端的编辑自动增减。
 */
const route = useRoute()
const router = useRouter()

const site = siteContent.state.site
const authed = session.isAuthenticated
const activePath = computed(() => route.path)

const navItems = computed(() =>
  siteContent.navPages.value.map((page) => ({
    label: page.title,
    path: siteContent.normalizePath(page.path),
  })),
)

function navigate(path: string): void {
  if (path !== route.path) void router.push(path)
}

function goConsole(): void {
  void router.push('/console/dashboard')
}
</script>

<template>
  <portal-shell
    :brand-title="site.name"
    :brand-tagline="site.tagline"
    :nav-items="navItems"
    :active-path="activePath"
    :version="site.version"
    :footer-note="site.footerNote"
    @navigate="navigate"
  >
    <template #actions>
      <n-button v-if="!authed" type="primary" @click="navigate('/login')">登录</n-button>
      <n-button v-else type="primary" secondary @click="goConsole">进入控制台</n-button>
    </template>

    <router-view />
  </portal-shell>
</template>
