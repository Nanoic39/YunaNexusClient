<script setup lang="ts">
import { session } from '@yuna/core'
import WorkspaceBrand from '../app/components/WorkspaceBrand.vue'
import DayNightToggle from '../app/components/DayNightToggle.vue'
</script>
<template>
  <div class="public-shell">
    <header class="public-header">
      <div class="public-header-inner">
        <RouterLink to="/" aria-label="YunaNexus 首页"><WorkspaceBrand /></RouterLink>
        <nav aria-label="公共导航">
          <RouterLink to="/">首页</RouterLink><RouterLink to="/about">关于</RouterLink>
        </nav>
        <div class="public-actions">
          <DayNightToggle /><RouterLink
            class="workspace-button"
            :to="session.isAuthenticated.value ? '/usr' : '/login'"
            >{{ session.isAuthenticated.value ? '个人中心' : '登录' }}</RouterLink
          >
        </div>
      </div>
    </header>
    <main class="public-main"><RouterView /></main>
    <footer class="public-footer"><span>YunaNexus</span><span>账户 · 应用 · 工作空间</span></footer>
  </div>
</template>
<style scoped>
.public-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--ws-canvas);
}
.public-header {
  border-bottom: 1px solid var(--ws-line);
  background: var(--ws-panel);
}
.public-header-inner {
  width: min(100%, var(--ws-public-width));
  min-height: var(--ws-public-header);
  padding-inline: var(--ws-gap-6);
  margin-inline: auto;
  display: flex;
  align-items: center;
  gap: var(--ws-gap-10);
}
nav {
  display: flex;
  gap: var(--ws-gap-6);
  align-self: stretch;
  align-items: center;
}
nav a {
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
  padding-block: var(--ws-gap-2);
}
nav a.router-link-exact-active {
  color: var(--yuna-primary);
  font-weight: 600;
}
.public-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--ws-gap-3);
}
.public-main {
  width: min(100%, var(--ws-public-width));
  margin-inline: auto;
  padding: var(--ws-gap-12) var(--ws-gap-6);
  flex: 1;
}
.public-footer {
  width: min(100%, var(--ws-public-width));
  margin-inline: auto;
  padding: var(--ws-gap-6);
  display: flex;
  justify-content: space-between;
  gap: var(--ws-gap-4);
  color: var(--ws-muted);
  font-size: var(--ws-font-caption);
}
@media (max-width: 600px) {
  .public-header-inner {
    gap: var(--ws-gap-4);
    padding-inline: var(--ws-gap-4);
    flex-wrap: wrap;
  }
  nav {
    gap: var(--ws-gap-4);
  }
  .public-actions {
    gap: var(--ws-gap-1);
  }
  .public-main {
    padding: var(--ws-gap-8) var(--ws-gap-4);
  }
  .public-footer {
    padding-inline: var(--ws-gap-4);
  }
}
</style>
