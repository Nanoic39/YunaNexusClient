<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'

/**
 * 登录 / 认证页布局：左侧动态品牌画布 + 右侧表单卡片。
 *
 * 视觉语言与控制台保持一致：中性灰承载信息，品牌色只作点缀（Logo、卡片顶部细线、光晕）。
 * 「动态」全部来自三处克制的微动效，不引入任何持续吸引注意力的元素：
 * 1. 背景由三团大半径模糊的品牌光晕缓慢漂移（26~34s 一循环），叠加极淡网格纹理；
 * 2. 页面元素按「品牌 → 说明 → 表单」的阅读顺序逐级淡入上浮（间隔 ~60ms）；
 * 3. 交互反馈沿用 Naive 的聚焦 / 悬停态，不额外叠加自研动画。
 * 所有动效均遵循 `prefers-reduced-motion`，并只动画 `opacity` / `transform`，避免布局抖动。
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

const year = new Date().getFullYear()
</script>

<template>
  <div class="yuna-auth">
    <!-- 动态品牌画布：光晕 + 网格，纯装饰，不参与交互与朗读 -->
    <div class="yuna-auth__canvas" aria-hidden="true">
      <span class="yuna-auth__blob yuna-auth__blob--a" />
      <span class="yuna-auth__blob yuna-auth__blob--b" />
      <span class="yuna-auth__blob yuna-auth__blob--c" />
      <span class="yuna-auth__grid" />
    </div>

    <div class="yuna-auth__corner">
      <slot name="corner">
        <ThemeToggle />
      </slot>
    </div>

    <aside class="yuna-auth__aside">
      <div class="yuna-auth__aside-inner">
        <div class="yuna-auth__brand-top yuna-rise" style="--d: 40ms">
          <slot name="logo">
            <span class="yuna-auth__mark">Y</span>
          </slot>
          <span class="yuna-auth__brand-name">{{ brandTitle }}</span>
        </div>

        <div class="yuna-auth__brand-body">
          <h2 v-if="brandTagline" class="yuna-auth__tagline yuna-rise" style="--d: 110ms">
            {{ brandTagline }}
          </h2>
          <p v-if="brandDescription" class="yuna-auth__brand-desc yuna-rise" style="--d: 170ms">
            {{ brandDescription }}
          </p>
          <div v-if="$slots.brand" class="yuna-rise" style="--d: 230ms">
            <slot name="brand" />
          </div>
        </div>

        <div class="yuna-auth__brand-footer yuna-rise" style="--d: 300ms">
          <slot name="brand-footer" />
        </div>
      </div>
    </aside>

    <main class="yuna-auth__panel">
      <!-- 窄屏收起品牌区后，以紧凑品牌标识替代，保持页面的品牌连续性 -->
      <div class="yuna-auth__compact-brand yuna-rise" style="--d: 40ms">
        <slot name="logo">
          <span class="yuna-auth__mark">Y</span>
        </slot>
        <span class="yuna-auth__brand-name">{{ brandTitle }}</span>
      </div>

      <div class="yuna-auth__card yuna-rise" style="--d: 130ms">
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

      <p class="yuna-auth__copyright yuna-rise" style="--d: 240ms">
        <slot name="copyright">© {{ year }} YunaNexus · Managed By YunaNexus Project</slot>
      </p>
    </main>
  </div>
</template>

<style scoped>
.yuna-auth {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--yuna-bg);

  /* 品牌画布配色：浅色下用品牌蓝 / 薄荷的柔和透明色，暗色下压低亮度与饱和度，
     避免夜里出现「发光板」。仅本组件内部使用，故不提升为全局 Token。 */
  --auth-blob-a: rgba(160, 216, 239, 0.72);
  --auth-blob-b: rgba(128, 255, 192, 0.38);
  --auth-blob-c: rgba(79, 174, 221, 0.34);
  --auth-grid: rgba(46, 143, 196, 0.085);
}

html.dark .yuna-auth {
  --auth-blob-a: rgba(46, 143, 196, 0.36);
  --auth-blob-b: rgba(31, 169, 113, 0.16);
  --auth-blob-c: rgba(34, 111, 155, 0.42);
  --auth-grid: rgba(160, 216, 239, 0.055);
}

/* ------------------------------ 动态品牌画布 ------------------------------ */

.yuna-auth__canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  animation: yuna-auth-fade 1.1s ease both;
  /* 光晕在中部就溶进底色、并早于分栏处完全消失，让画面只留下「左浓右净」的构图感，
     而不是一条可辨认的分割线 —— 两列底色本来就是同一个颜色，因此不存在接缝 */
  -webkit-mask-image: linear-gradient(100deg, #000 0%, #000 30%, rgb(0 0 0 / 0%) 58%);
  mask-image: linear-gradient(100deg, #000 0%, #000 30%, rgb(0 0 0 / 0%) 58%);
}

.yuna-auth__blob {
  position: absolute;
  display: block;
  border-radius: 50%;
  filter: blur(72px);
  will-change: transform;
}

.yuna-auth__blob--a {
  top: -160px;
  left: -120px;
  width: 560px;
  height: 560px;
  background: radial-gradient(circle at 42% 42%, var(--auth-blob-a), rgba(160, 216, 239, 0) 68%);
  animation: yuna-auth-drift-a 26s ease-in-out infinite;
}

.yuna-auth__blob--b {
  bottom: -200px;
  left: 16%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle at 50% 50%, var(--auth-blob-b), rgba(128, 255, 192, 0) 66%);
  animation: yuna-auth-drift-b 34s ease-in-out infinite;
}

.yuna-auth__blob--c {
  top: 30%;
  left: 30%;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle at 50% 50%, var(--auth-blob-c), rgba(79, 174, 221, 0) 64%);
  animation: yuna-auth-drift-c 30s ease-in-out infinite;
}

/* 极淡网格：只在中左部透出，制造「中控台」的技术底纹 */
.yuna-auth__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--auth-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--auth-grid) 1px, transparent 1px);
  background-size: 46px 46px;
  -webkit-mask-image: radial-gradient(125% 92% at 12% 26%, #000 0%, rgb(0 0 0 / 0%) 82%);
  mask-image: radial-gradient(125% 92% at 12% 26%, #000 0%, rgb(0 0 0 / 0%) 82%);
}

/* ------------------------------ 左侧品牌区 ------------------------------ */

.yuna-auth__aside {
  position: relative;
  z-index: 1;
  display: flex;
  overflow: hidden;
}

.yuna-auth__aside-inner {
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
  box-shadow: 0 6px 16px rgba(46, 143, 196, 0.26);
}

.yuna-auth__brand-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.yuna-auth__brand-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 440px;
}

.yuna-auth__tagline {
  font-size: clamp(24px, 2.1vw, 32px);
  font-weight: 600;
  line-height: 1.36;
  letter-spacing: -0.01em;
  color: var(--yuna-gray-900);
}

.yuna-auth__brand-desc {
  font-size: 14px;
  line-height: 1.75;
  color: var(--yuna-gray-700);
}

.yuna-auth__brand-footer {
  font-size: 12px;
  color: var(--yuna-gray-600);
}

/* 窄屏才出现的紧凑品牌标识 */
.yuna-auth__compact-brand {
  display: none;
  align-items: center;
  gap: 10px;
}

/* ------------------------------ 右侧表单区 ------------------------------ */

.yuna-auth__panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 64px 24px 40px;
}

.yuna-auth__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  max-width: 400px;
  padding: 34px 32px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

/* 卡片顶部品牌细线：极弱，仅用于把表单与品牌色关联起来 */
.yuna-auth__card::before {
  position: absolute;
  top: 0;
  right: 26px;
  left: 26px;
  height: 2px;
  content: '';
  background: linear-gradient(
    90deg,
    transparent,
    var(--yuna-brand),
    var(--yuna-mint),
    transparent
  );
  border-radius: 999px;
  opacity: 0.85;
}

.yuna-auth__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.yuna-auth__heading {
  font-size: 21px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--yuna-gray-900);
}

.yuna-auth__subheading {
  font-size: 13px;
  line-height: 1.6;
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

/* 主题切换：固定在右上角，与门户 / 控制台顶栏开关保持一致的位置直觉 */
.yuna-auth__corner {
  position: absolute;
  top: 16px;
  right: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ------------------------------ 动效 ------------------------------ */

@keyframes yuna-auth-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes yuna-auth-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes yuna-auth-drift-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(4%, 6%, 0) scale(1.1);
  }
}

@keyframes yuna-auth-drift-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.06);
  }

  50% {
    transform: translate3d(-5%, -4%, 0) scale(0.94);
  }
}

@keyframes yuna-auth-drift-c {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(0.98);
  }

  50% {
    transform: translate3d(6%, -6%, 0) scale(1.07);
  }
}

.yuna-rise {
  animation: yuna-auth-rise 0.66s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--d, 0ms);
}

/* ------------------------------ 窄屏 ------------------------------ */

@media (max-width: 900px) {
  .yuna-auth {
    grid-template-columns: minmax(0, 1fr);
  }

  .yuna-auth__aside {
    display: none;
  }

  /* 单列后光晕改到顶部，并沿用同样的「先溶进底色」逻辑，只作背景氛围 */
  .yuna-auth__canvas {
    opacity: 0.8;
    -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 24%, rgb(0 0 0 / 0%) 56%);
    mask-image: linear-gradient(180deg, #000 0%, #000 24%, rgb(0 0 0 / 0%) 56%);
  }

  .yuna-auth__panel {
    gap: 18px;
    padding: 76px 20px 32px;
  }

  .yuna-auth__compact-brand {
    display: flex;
    width: 100%;
    max-width: 400px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .yuna-rise,
  .yuna-auth__canvas,
  .yuna-auth__blob {
    animation: none;
  }
}
</style>
