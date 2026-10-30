<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>
<template>
  <div class="workspace-brand">
    <span class="brand-symbol" aria-hidden="true">Y</span
    ><span v-if="!compact" class="brand-wordmark">YunaNexus</span>
  </div>
</template>
<style scoped>
.workspace-brand {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-3);
  white-space: nowrap;
}
.brand-symbol {
  display: grid;
  place-items: center;
  width: var(--ws-brand-size);
  height: var(--ws-brand-size);
  border-radius: var(--ws-radius);
  background: var(--yuna-primary);
  color: var(--yuna-on-primary);
  font-size: var(--ws-font-body);
  line-height: 1;
  font-weight: 700;
}
.brand-wordmark {
  font-size: var(--ws-font-body);
  font-weight: 650;
  letter-spacing: -0.25px;
  color: var(--ws-ink);
}
</style>
