<script setup lang="ts">
import { Icon } from '@yuna/ui'
const features = [
  {
    icon: 'shield',
    title: '统一账户',
    description: '用同一个账户连接平台，清楚掌握自己的访问身份。',
  },
  {
    icon: 'layers',
    title: '应用连接',
    description: '以统一的授权体系连接应用，让不同工作空间协同。',
  },
  {
    icon: 'users',
    title: '团队管理',
    description: '在有权访问的管理台中，管理账户与平台访问状态。',
  },
]
</script>
<template>
  <div class="home-page">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="eyebrow">YunaNexus / 工作空间</p>
      <h1 id="home-title">让工作，从连接开始。</h1>
      <p class="home-description">
        连接账户、应用与团队管理。<br />先了解平台，再进入属于你的工作空间。
      </p>
      <div class="home-actions">
        <RouterLink class="workspace-button primary" to="/about"
          >了解 YunaNexus<Icon name="arrowRight"
        /></RouterLink>
      </div>
    </section>
    <section class="feature-grid" aria-label="平台能力">
      <article v-for="feature in features" :key="feature.title" class="feature-card">
        <div class="feature-icon"><Icon :name="feature.icon" :size="20" /></div>
        <h2>{{ feature.title }}</h2>
        <p>{{ feature.description }}</p>
      </article>
    </section>
    <div class="home-access">
      <Icon name="shield" />
      <p>首页和关于页无需登录；个人中心与管理台仅对已登录且有相应权限的账户开放。</p>
    </div>
  </div>
</template>
<style scoped>
.home-intro {
  padding-block: var(--ws-gap-12);
  max-width: var(--ws-article-width);
}
.eyebrow {
  font-size: var(--ws-font-caption);
  color: var(--yuna-primary);
  font-weight: 600;
  margin-bottom: var(--ws-gap-5);
}
.home-intro h1 {
  font-size: var(--ws-font-hero);
  line-height: 1.4;
  letter-spacing: -0.7px;
  font-weight: 600;
  margin-bottom: var(--ws-gap-5);
}
.home-description {
  font-size: var(--ws-font-body);
  line-height: 1.9;
  color: var(--ws-muted);
}
.home-actions {
  margin-top: var(--ws-gap-6);
}
.home-actions .workspace-button {
  height: var(--ws-auth-control);
  padding-inline: var(--ws-gap-4);
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ws-gap-4);
  margin-top: var(--ws-gap-6);
}
.feature-card {
  background: var(--ws-panel);
  border: 1px solid var(--ws-line);
  border-radius: var(--ws-radius-lg);
  padding: var(--ws-gap-6);
}
.feature-icon {
  color: var(--yuna-primary);
  margin-bottom: var(--ws-gap-4);
}
.feature-card h2 {
  font-size: var(--ws-font-body);
  margin-bottom: var(--ws-gap-2);
}
.feature-card p,
.home-access {
  font-size: var(--ws-font-control);
  line-height: 1.8;
  color: var(--ws-muted);
}
.home-access {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
  margin-top: var(--ws-gap-6);
}
@media (max-width: 640px) {
  .home-intro {
    padding-block: var(--ws-gap-6);
  }
  .feature-grid {
    grid-template-columns: 1fr;
  }
  .home-access {
    align-items: start;
  }
}
</style>
