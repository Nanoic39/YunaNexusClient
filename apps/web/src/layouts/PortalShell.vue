<script setup lang="ts">
import WorkspaceBrand from '../app/components/WorkspaceBrand.vue'
import DayNightToggle from '../app/components/DayNightToggle.vue'
</script>
<template>
  <div class="portal-shell">
    <header class="portal-header">
      <RouterLink to="/" aria-label="返回首页"><WorkspaceBrand /></RouterLink>
      <nav aria-label="个人中心导航">
        <RouterLink to="/usr">个人中心</RouterLink
        ><RouterLink to="/usr/settings">主题与外观</RouterLink>
      </nav>
      <DayNightToggle />
    </header>
    <main class="account-shell"><RouterView /></main>
  </div>
</template>
<style scoped>
.portal-shell {
  min-height: 100dvh;
  background: var(--ws-canvas);
}
.portal-header {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-6);
  min-height: var(--ws-public-header);
  padding: var(--ws-gap-3) var(--ws-gap-6);
  border-bottom: 1px solid var(--ws-line);
  background: var(--ws-panel);
}
nav {
  display: flex;
  gap: var(--ws-gap-5);
  margin-left: auto;
}
nav a {
  color: var(--ws-muted);
  font-size: var(--ws-font-control);
}
nav a.router-link-exact-active {
  color: var(--yuna-primary);
}
.account-shell {
  padding: var(--ws-gap-8) var(--ws-gap-6);
}
@media (max-width: 600px) {
  .portal-header {
    flex-wrap: wrap;
    gap: var(--ws-gap-3);
  }
  .account-shell {
    padding: var(--ws-gap-5) var(--ws-gap-4);
  }
}
</style>
