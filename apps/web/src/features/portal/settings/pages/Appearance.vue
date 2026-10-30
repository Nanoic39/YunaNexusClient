<script setup lang="ts">
import { appearance, paletteOptions } from '@yuna/theme'
const fonts = [
  { value: 'system', label: '系统默认', description: '清晰、熟悉的系统字体' },
  { value: 'serif', label: '阅读衬线', description: '带衬线的阅读字体' },
] as const
const surfaces = [
  { value: 'plain', label: '简洁', description: '清晰的边界与纯净表面' },
  { value: 'glass', label: '轻磨砂', description: '轻微透明与背景模糊' },
] as const
const densities = [
  { value: 'compact', label: '紧凑', description: '较高信息密度，适合管理操作' },
  { value: 'comfortable', label: '舒适', description: '增加控件和列表的留白' },
] as const
</script>
<template>
  <div class="appearance-page">
    <header class="settings-heading">
      <div>
        <h1>主题与外观</h1>
        <p>按你的习惯调整配色、字体和界面呈现。</p>
      </div>
      <button type="button" class="workspace-button" @click="appearance.reset">恢复默认</button>
    </header>
    <section class="workspace-panel settings-panel">
      <div class="setting-section">
        <h2>配色</h2>
        <div class="setting-options" role="group" aria-label="配色">
          <button
            v-for="option in paletteOptions"
            :key="option.value"
            class="setting-option palette-option"
            :class="{ selected: appearance.state.palette === option.value }"
            :aria-pressed="appearance.state.palette === option.value"
            @click="appearance.set({ palette: option.value })"
          >
            <span class="palette-dot" :data-palette="option.value" />{{ option.label }}
          </button>
        </div>
      </div>
      <div class="setting-section">
        <h2>字体</h2>
        <div class="setting-options" role="group" aria-label="字体">
          <button
            v-for="option in fonts"
            :key="option.value"
            class="setting-option"
            :class="{ selected: appearance.state.font === option.value }"
            :aria-pressed="appearance.state.font === option.value"
            @click="appearance.set({ font: option.value })"
          >
            <strong>{{ option.label }}</strong
            ><span>{{ option.description }}</span>
          </button>
        </div>
      </div>
      <div class="setting-section">
        <h2>界面风格</h2>
        <div class="setting-options" role="group" aria-label="界面风格">
          <button
            v-for="option in surfaces"
            :key="option.value"
            class="setting-option"
            :class="{ selected: appearance.state.surface === option.value }"
            :aria-pressed="appearance.state.surface === option.value"
            @click="appearance.set({ surface: option.value })"
          >
            <strong>{{ option.label }}</strong
            ><span>{{ option.description }}</span>
          </button>
        </div>
      </div>
      <div class="setting-section">
        <h2>布局密度</h2>
        <div class="setting-options" role="group" aria-label="布局密度">
          <button
            v-for="option in densities"
            :key="option.value"
            class="setting-option"
            :class="{ selected: appearance.state.density === option.value }"
            :aria-pressed="appearance.state.density === option.value"
            @click="appearance.set({ density: option.value })"
          >
            <strong>{{ option.label }}</strong
            ><span>{{ option.description }}</span>
          </button>
        </div>
      </div>
    </section>
    <p class="settings-note">
      主题设置按账户保存在当前浏览器，暂不跨设备同步。日间与夜间显示可通过页顶按钮独立切换。
    </p>
  </div>
</template>
<style scoped>
.appearance-page {
  max-width: var(--ws-article-width);
  margin-inline: auto;
  width: 100%;
}
.settings-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: var(--ws-gap-4);
  margin-bottom: var(--ws-gap-6);
}
.settings-heading p,
.settings-note {
  font-size: var(--ws-font-control);
  color: var(--ws-muted);
  line-height: 1.8;
}
.settings-heading h1 {
  margin-bottom: var(--ws-gap-2);
}
.setting-section + .setting-section {
  margin-top: var(--ws-gap-6);
  padding-top: var(--ws-gap-6);
  border-top: 1px solid var(--ws-line);
}
.setting-section h2 {
  font-size: var(--ws-font-control);
  margin-bottom: var(--ws-gap-3);
}
.setting-options {
  display: flex;
  gap: var(--ws-gap-3);
  flex-wrap: wrap;
}
.setting-option {
  text-align: left;
  display: grid;
  gap: var(--ws-gap-1);
  flex: 1;
  padding: var(--ws-gap-3);
  border: 1px solid var(--ws-line);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
  color: var(--ws-ink);
  cursor: pointer;
  font-size: var(--ws-font-control);
}
.setting-option strong {
  font-weight: 500;
}
.setting-option > span:not(.palette-dot) {
  color: var(--ws-muted);
  font-size: var(--ws-font-caption);
}
.setting-option.selected {
  border-color: var(--yuna-primary);
  background: var(--ws-selected);
}
.palette-option {
  display: flex;
  align-items: center;
  gap: var(--ws-gap-2);
}
.palette-dot {
  width: var(--ws-gap-3);
  height: var(--ws-gap-3);
  border-radius: 50%;
  background: var(--ws-swatch-blue);
}
.palette-dot[data-palette='green'] {
  background: var(--ws-swatch-green);
}
.palette-dot[data-palette='indigo'] {
  background: var(--ws-swatch-indigo);
}
.settings-note {
  margin-top: var(--ws-gap-4);
}
@media (max-width: 600px) {
  .settings-heading {
    flex-wrap: wrap;
  }
  .setting-options {
    flex-direction: column;
  }
}
</style>
