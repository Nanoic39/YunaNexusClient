<script setup lang="ts">
import { Icon } from '@yuna/ui'
</script>
<template>
  <article class="about-page">
    <p class="eyebrow">关于平台</p>
    <h1>关于 YunaNexus</h1>
    <p class="about-lead">连接账户、应用与工作空间的统一平台。</p>
    <section>
      <h2>一个账户，清晰的访问边界</h2>
      <p>
        YunaNexus
        将账户身份、应用授权与团队管理连接起来。每个账户只访问被授权的资源，管理功能向具备相应权限的账户开放。
      </p>
    </section>
    <section>
      <h2>先了解，再开始</h2>
      <p>
        你无需登录即可浏览首页和关于页。访问个人中心或管理台时，再使用统一登录入口进入自己的工作区。
      </p>
    </section>
    <section>
      <h2>按自己的习惯使用</h2>
      <p>
        日间与夜间显示可随时切换。配色、字体、界面风格与布局等主题偏好，在登录后的个人中心调整。
      </p>
    </section>
    <RouterLink to="/" class="workspace-button">返回首页<Icon name="arrowRight" /></RouterLink>
  </article>
</template>
<style scoped>
.about-page {
  max-width: var(--ws-article-width);
  margin-inline: auto;
  padding-block: var(--ws-gap-6);
}
.eyebrow {
  color: var(--yuna-primary);
  font-size: var(--ws-font-caption);
  font-weight: 600;
  margin-bottom: var(--ws-gap-3);
}
.about-page h1 {
  font-size: var(--ws-font-title);
  margin-bottom: var(--ws-gap-3);
}
.about-lead {
  color: var(--ws-muted);
  font-size: var(--ws-font-body);
  line-height: 1.8;
  padding-bottom: var(--ws-gap-8);
  border-bottom: 1px solid var(--ws-line);
}
section {
  margin-block: var(--ws-gap-8);
}
section h2 {
  font-size: var(--ws-font-body);
  margin-bottom: var(--ws-gap-3);
}
section p {
  font-size: var(--ws-font-body);
  line-height: 1.9;
  color: var(--ws-muted);
}
.about-page > .workspace-button {
  margin-top: var(--ws-gap-2);
}
</style>
