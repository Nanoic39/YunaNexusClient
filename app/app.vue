<script setup lang="ts">
import { onMounted } from 'vue';
import AppProviders from "~/components/AppProviders.vue";

onMounted(() => {
  document.body.classList.add('loaded');
});
</script>

<template>
  <AppProviders>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </AppProviders>
</template>

<style>
/* 必须清除 margin，否则布局会有白边 */
body {
  margin: 0;
  padding: 0;
  overflow: hidden; /* 防止双滚动条 */
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-new(root) {
  z-index: 2147483646;
}

::view-transition-old(root) {
  z-index: 1;
}
</style>
