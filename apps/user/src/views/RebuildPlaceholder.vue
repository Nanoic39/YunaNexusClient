<script setup lang="ts">
/** C 端重构占位页：C 端在 B 端完成后启动，当前仅保证应用可启动。 */
</script>

<template>
  <div class="rebuild">
    <h1>用户中心正在重构</h1>
    <p>管理端完成后开始。</p>
  </div>
</template>

<style scoped>
.rebuild {
  display: grid;
  place-content: center;
  gap: 6px;
  height: 60vh;
  text-align: center;
  color: #57606a;
}
h1 {
  margin: 0;
  font-size: 18px;
  color: #1f2328;
}
p {
  margin: 0;
  font-size: 13px;
}
</style>
