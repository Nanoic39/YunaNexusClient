<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'

/** Shared, focused authentication layout; forms keep their own fields and validation. */
interface Props {
  /** 品牌名 */
  brandTitle?: string
  /** 品牌区主标语 */
  brandTagline?: string
  /** 品牌区补充说明 */
  brandDescription?: string
  /** 表单区标题 */
  heading: string
  /** 表单区副标题 */
  subheading?: string
  /** 表单区底部提示文案 */
  tips?: string
}

withDefaults(defineProps<Props>(), {
  brandTitle: 'YunaNexus',
  brandTagline: '',
  brandDescription: '',
  subheading: '',
  tips: '',
})

const year = new Date().getFullYear()
</script>

<template>
  <div class="yuna-auth">
    <header class="yuna-auth__bar">
      <span class="yuna-auth__brand-top"
        ><slot name="logo"><span class="yuna-auth__mark">Y</span></slot
        ><span>{{ brandTitle }}</span></span
      >
      <slot name="corner"><ThemeToggle /></slot>
    </header>
    <div class="yuna-auth__workspace">
      <aside class="yuna-auth__aside">
        <div class="yuna-auth__brand-body">
          <h2 v-if="brandTagline" class="yuna-auth__tagline">{{ brandTagline }}</h2>
          <p v-if="brandDescription" class="yuna-auth__brand-desc">{{ brandDescription }}</p>
          <slot name="brand" />
        </div>
        <div v-if="$slots['brand-footer']" class="yuna-auth__brand-footer">
          <slot name="brand-footer" />
        </div>
      </aside>
      <main class="yuna-auth__panel">
        <div class="yuna-auth__card">
          <header class="yuna-auth__head">
            <h1 class="yuna-auth__heading">{{ heading }}</h1>
            <p v-if="subheading" class="yuna-auth__subheading">{{ subheading }}</p>
          </header>
          <div class="yuna-auth__body"><slot /></div>
          <footer v-if="tips || $slots.footer" class="yuna-auth__foot">
            <slot name="footer">{{ tips }}</slot>
          </footer>
        </div>
      </main>
    </div>
    <footer class="yuna-auth__copyright">
      <slot name="copyright">© {{ year }} YunaNexus</slot>
    </footer>
  </div>
</template>

<style scoped>
.yuna-auth {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--yuna-bg);
}
.yuna-auth__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 12px 32px;
  background: var(--yuna-surface);
  border-bottom: 1px solid var(--yuna-gray-200);
}
.yuna-auth__brand-top {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  color: var(--yuna-gray-900);
  font-size: 16px;
  font-weight: 600;
}
.yuna-auth__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  color: var(--yuna-on-primary);
  background: var(--yuna-primary);
  border-radius: var(--yuna-radius-md);
  font-size: 16px;
  font-weight: 700;
}
.yuna-auth__workspace {
  display: grid;
  grid-template-columns: minmax(260px, 360px) minmax(360px, 460px);
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  gap: 64px;
  width: 100%;
  padding: 32px;
}
.yuna-auth__aside {
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-width: 0;
}
.yuna-auth__brand-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.yuna-auth__tagline {
  font-size: 28px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--yuna-gray-900);
}
.yuna-auth__brand-desc {
  font-size: 14px;
  line-height: 1.8;
  color: var(--yuna-gray-700);
}
.yuna-auth__brand-footer,
.yuna-auth__copyright {
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.yuna-auth__panel {
  min-width: 0;
}
.yuna-auth__card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding: 28px;
  background: var(--yuna-surface);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-lg);
}
.yuna-auth__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.yuna-auth__heading {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}
.yuna-auth__subheading {
  font-size: 13px;
  color: var(--yuna-gray-700);
  line-height: 1.6;
}
.yuna-auth__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.yuna-auth__foot {
  padding-top: 16px;
  border-top: 1px solid var(--yuna-gray-200);
  font-size: 13px;
  color: var(--yuna-gray-700);
  line-height: 1.7;
}
.yuna-auth__copyright {
  padding: 16px;
  text-align: center;
}
@media (max-width: 900px) {
  .yuna-auth__workspace {
    grid-template-columns: minmax(0, 460px);
    gap: 0;
    padding: 24px 16px;
  }
  .yuna-auth__aside {
    display: none;
  }
  .yuna-auth__bar {
    min-height: 56px;
    padding: 10px 16px;
  }
}
@media (max-width: 480px) {
  .yuna-auth__card {
    padding: 22px 18px;
  }
}
</style>
