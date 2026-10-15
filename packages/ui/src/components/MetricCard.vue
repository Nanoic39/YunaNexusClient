<script setup lang="ts">
import { computed } from 'vue'
import { NSkeleton } from 'naive-ui'

/**
 * 指标卡：概览页的核心数字展示。
 *
 * 以「标签 + 数值 + 辅助信息」三段式呈现，趋势字段仅在显式传入时渲染，
 * 不做任何装饰性图表，保持中控台的克制观感。
 */
interface Props {
  label: string
  value?: string | number | null
  /** 数值后缀单位，如「个」「次」 */
  unit?: string
  /** 环比/同比变化百分比，正数向上、负数向下 */
  trend?: number | null
  /** 趋势说明，如「较昨日」 */
  trendLabel?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  value: '—',
  unit: '',
  trend: null,
  trendLabel: '',
  loading: false,
})

const displayValue = computed(() =>
  props.value === null || props.value === undefined || props.value === '' ? '—' : props.value,
)

const hasTrend = computed(() => props.trend !== null && props.trend !== undefined)
const trendUp = computed(() => (props.trend ?? 0) >= 0)
const trendText = computed(() => {
  if (!hasTrend.value) return ''
  const abs = Math.abs(props.trend as number)
  return `${trendUp.value ? '+' : '-'}${abs}%`
})
</script>

<template>
  <div class="yuna-metric">
    <div class="yuna-metric__head">
      <span class="yuna-metric__label">{{ label }}</span>
      <slot name="icon" />
    </div>

    <n-skeleton v-if="loading" text style="width: 60%; height: 28px" />
    <div v-else class="yuna-metric__value">
      <span class="yuna-metric__number">{{ displayValue }}</span>
      <span v-if="unit" class="yuna-metric__unit">{{ unit }}</span>
    </div>

    <div class="yuna-metric__foot">
      <slot name="footer">
        <template v-if="hasTrend">
          <span class="yuna-metric__trend" :class="trendUp ? 'is-up' : 'is-down'">
            {{ trendText }}
          </span>
          <span v-if="trendLabel" class="yuna-metric__trend-label">{{ trendLabel }}</span>
        </template>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.yuna-metric {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.yuna-metric__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.yuna-metric__label {
  font-size: 13px;
  color: var(--yuna-gray-600);
}

.yuna-metric__value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.yuna-metric__number {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--yuna-gray-900);
  font-variant-numeric: tabular-nums;
}

.yuna-metric__unit {
  font-size: 13px;
  color: var(--yuna-gray-600);
}

.yuna-metric__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
  font-size: 12px;
  color: var(--yuna-gray-600);
}

.yuna-metric__trend {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.yuna-metric__trend.is-up {
  color: var(--yuna-success);
}

.yuna-metric__trend.is-down {
  color: var(--yuna-danger);
}
</style>
