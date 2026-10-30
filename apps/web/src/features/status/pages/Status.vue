<script setup lang="ts">
import { computed } from 'vue'
import { session } from '@yuna/core'
import { Icon } from '@yuna/ui'
import WorkspaceBrand from '../../../app/components/WorkspaceBrand.vue'
import DayNightToggle from '../../../app/components/DayNightToggle.vue'
const props = defineProps<{ code: number }>()
const status = computed(
  () =>
    ({
      403: {
        icon: 'shield',
        label: '访问受限',
        title: '你暂时没有访问权限',
        description: '当前账户无权访问此页面。请返回个人中心，或联系管理员确认访问权限。',
      },
      404: {
        icon: 'search',
        label: '页面未找到',
        title: '这个页面不在这里',
        description: '页面可能已经移动，或链接地址有误。请检查访问地址，也可以返回工作区继续。',
      },
      418: {
        icon: 'tea',
        label: 'I’m a teapot',
        title: '这里暂时只供应茶',
        description: '这只茶壶无法煮咖啡。你可以返回工作区，继续刚才的操作。',
      },
    })[props.code] ?? {
      icon: 'file',
      label: '页面不可用',
      title: '暂时无法打开此页面',
      description: '请返回工作区后重试。',
    },
)
const home = computed(() => (props.code === 403 && session.isAuthenticated.value ? '/usr' : '/'))
</script>
<template>
  <div class="status-page">
    <header class="status-header">
      <RouterLink to="/" aria-label="返回首页"><WorkspaceBrand /></RouterLink><DayNightToggle />
    </header>
    <main class="status-main">
      <section class="status-content" aria-labelledby="status-title">
        <div class="status-symbol" aria-hidden="true"><Icon :name="status.icon" :size="36" /></div>
        <p class="status-label">
          <span>{{ code }}</span
          ><span class="label-divider" aria-hidden="true" />{{ status.label }}
        </p>
        <h1 id="status-title">{{ status.title }}</h1>
        <p class="status-description">{{ status.description }}</p>
        <RouterLink class="workspace-button primary status-action" :to="home"
          >{{ code === 403 && session.isAuthenticated.value ? '返回个人中心' : '返回首页'
          }}<Icon name="arrowRight"
        /></RouterLink>
      </section>
    </main>
    <footer class="status-footer">YunaNexus</footer>
  </div>
</template>
<style scoped>
.status-page {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--ws-canvas);
}
.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ws-gap-6) var(--ws-gap-8);
}
.status-main {
  display: grid;
  place-items: center;
  padding: var(--ws-gap-10) var(--ws-gap-6) var(--ws-gap-12);
}
.status-content {
  width: min(100%, var(--ws-status-max-width));
  text-align: center;
  padding-bottom: var(--ws-gap-10);
}
.status-symbol {
  width: var(--ws-status-symbol-size);
  height: var(--ws-status-symbol-size);
  margin: 0 auto var(--ws-gap-6);
  border-radius: var(--ws-gap-6);
  background: var(--ws-selected);
  color: var(--yuna-primary);
  display: grid;
  place-items: center;
}
.status-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ws-gap-2);
  color: var(--ws-muted);
  font-size: var(--ws-font-caption);
  line-height: 1.5;
}
.status-label > span:first-child {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.label-divider {
  width: 1px;
  height: var(--ws-gap-3);
  background: var(--ws-line);
}
.status-content h1 {
  margin: var(--ws-gap-3) 0;
  font-size: var(--ws-font-title);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.5px;
}
.status-description {
  max-width: 30em;
  margin-inline: auto;
  color: var(--ws-muted);
  font-size: var(--ws-font-body);
  line-height: 1.8;
  text-wrap: balance;
}
.status-action {
  margin-top: var(--ws-gap-6);
  padding-inline: var(--ws-gap-4);
}
.status-footer {
  padding: var(--ws-gap-6);
  text-align: center;
  color: var(--ws-faint);
  font-size: var(--ws-font-caption);
}
@media (max-width: 600px) {
  .status-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--ws-gap-5);
  }
  .status-content {
    padding-bottom: 0;
  }
}
</style>
