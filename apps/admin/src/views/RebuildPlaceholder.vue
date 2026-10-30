<script setup lang="ts">
/**
 * 重构期间的占位页。
 *
 * 旧页面已全部删除（见 inventory/旧前端清单（重构参考）.md 与 tag legacy-frontend-before-rebuild），
 * 新页面按后端接口重建，逐页替换本占位路由。
 */
</script>

<template>
  <div class="rebuild">
    <h1>管理端正在重构</h1>
    <p>页面按后端接口重建中，完成一个上线一个。</p>
  </div>
</template>

<style scoped>
.rebuild {
  display: grid;
  place-content: center;
  gap: 6px;
  height: 60vh;
  text-align: center;
  color: var(--yuna-ink-2, #57606a);
}
h1 {
  margin: 0;
  font-size: 18px;
  color: var(--yuna-ink, #1f2328);
}
p {
  margin: 0;
  font-size: 13px;
}
</style>
