<script setup lang="ts">
/**
 * 登录/认证页布局：左侧品牌区 + 右侧表单卡片。
 *
 * 品牌区使用品牌蓝的极浅渐变与文字，并叠加极弱的几何装饰，保持克制不喧宾夺主；
 * 右侧表单以「卡片」承载，避免大面积留白导致的空旷感。
 * 小屏（<900px）时收起品牌区，仅保留表单卡片。
 */
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
</script>

<template>
  <div class="yuna-auth">
    <aside class="yuna-auth__aside">
      <div class="yuna-auth__aside-inner">
        <div class="yuna-auth__brand-top">
          <slot name="logo">
            <span class="yuna-auth__mark">Y</span>
          </slot>
          <span class="yuna-auth__brand-name">{{ brandTitle }}</span>
        </div>

        <div class="yuna-auth__brand-body">
          <h2 class="yuna-auth__tagline">{{ brandTagline }}</h2>
          <p v-if="brandDescription" class="yuna-auth__brand-desc">{{ brandDescription }}</p>
          <slot name="brand" />
        </div>

        <div class="yuna-auth__brand-footer">
          <slot name="brand-footer" />
        </div>
      </div>

      <span class="yuna-auth__decor yuna-auth__decor--a" aria-hidden="true" />
      <span class="yuna-auth__decor yuna-auth__decor--b" aria-hidden="true" />
    </aside>

    <main class="yuna-auth__panel">
      <div class="yuna-auth__card">
        <header class="yuna-auth__head">
          <h1 class="yuna-auth__heading">{{ heading }}</h1>
          <p v-if="subheading" class="yuna-auth__subheading">{{ subheading }}</p>
        </header>

        <div class="yuna-auth__body">
          <slot />
        </div>

        <footer v-if="tips || $slots.footer" class="yuna-auth__foot">
          <slot name="footer">{{ tips }}</slot>
        </footer>
      </div>

      <p class="yuna-auth__copyright">
        <slot name="copyright">© {{ new Date().getFullYear() }} YunaNexus · Managed By YunaNexus Project</slot>
      </p>
    </main>
  </div>
</template>

<style scoped>
.yuna-auth {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--yuna-surface);
}

/* ------------------------------ 左侧品牌区 ------------------------------ */

.yuna-auth__aside {
  position: relative;
  display: flex;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 8% 0%, var(--yuna-blue-100) 0%, rgba(226, 242, 250, 0) 58%),
    linear-gradient(150deg, var(--yuna-blue-50) 0%, var(--yuna-surface) 68%);
  border-right: 1px solid var(--yuna-gray-200);
}

.yuna-auth__aside-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: space-between;
  gap: 32px;
  padding: 44px 52px;
}

.yuna-auth__brand-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.yuna-auth__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 16px;
  font-weight: 700;
  color: var(--yuna-blue-800);
  background: linear-gradient(135deg, var(--yuna-brand), var(--yuna-mint));
  border-radius: var(--yuna-radius-md);
}

.yuna-auth__brand-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.yuna-auth__brand-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 420px;
}

.yuna-auth__tagline {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--yuna-gray-900);
}

.yuna-auth__brand-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--yuna-gray-700);
}

.yuna-auth__brand-footer {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.yuna-auth__decor {
  position: absolute;
  display: block;
  border-radius: 50%;
  pointer-events: none;
}

.yuna-auth__decor--a {
  right: -80px;
  bottom: -80px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle at 30% 30%, rgba(160, 216, 239, 0.5), rgba(160, 216, 239, 0) 68%);
}

.yuna-auth__decor--b {
  top: 40%;
  right: 12%;
  width: 120px;
  height: 120px;
  border: 1px solid rgba(46, 143, 196, 0.16);
}

/* ------------------------------ 右侧表单区 ------------------------------ */

.yuna-auth__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 24px;
  background: var(--yuna-gray-50);
}

.yuna-auth__card {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  max-width: 392px;
  padding: 32px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.yuna-auth__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.yuna-auth__heading {
  font-size: 20px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.yuna-auth__subheading {
  font-size: 13px;
  line-height: 1.5;
  color: var(--yuna-gray-600);
}

.yuna-auth__body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.yuna-auth__foot {
  padding-top: 18px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--yuna-gray-600);
  border-top: 1px solid var(--yuna-gray-200);
}

.yuna-auth__copyright {
  font-size: 12px;
  color: var(--yuna-gray-500);
}

@media (max-width: 900px) {
  .yuna-auth {
    grid-template-columns: minmax(0, 1fr);
  }

  .yuna-auth__aside {
    display: none;
  }

  .yuna-auth__panel {
    background: var(--yuna-surface);
  }

  .yuna-auth__card {
    border: none;
    box-shadow: none;
    padding: 0;
  }
}
</style>
