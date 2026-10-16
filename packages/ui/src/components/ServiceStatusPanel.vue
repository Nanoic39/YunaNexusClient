<script setup lang="ts">
import { computed, ref } from 'vue'
import { useServiceStatus, serviceHealthText } from '@yuna/core'
import type { ContentElement, ContentItem, ServiceStatusPeriod } from '@yuna/core'

const props = defineProps<{ element: ContentElement }>()
const hours = ref(24)
const windowLabel = computed(() =>
  hours.value === 24 ? '24 小时' : hours.value === 168 ? '7 天' : '30 天',
)
const bucketLabel = computed(() =>
  hours.value === 24 ? '30 分钟' : hours.value === 168 ? '3 小时' : '12 小时',
)
const { loading, error, lastUpdated, refresh, detailOf } = useServiceStatus(
  () => props.element,
  () => hours.value,
)
const selected = ref<Record<string, number>>({})
const hasSource = computed(() =>
  Boolean(props.element.statusUrl || props.element.items.some((i) => i.statusUrl)),
)
const overall = computed(() => {
  if (error.value) return 'unknown'
  const states = props.element.items.map((i) => detailOf(i).health)
  if (states.includes('down')) return 'down'
  if (states.includes('degraded')) return 'degraded'
  if (!states.length || states.some((s) => !s || s === 'unknown')) return 'unknown'
  return states.every((s) => s === 'planned') ? 'planned' : 'up'
})
const titles = {
  up: '所有服务运行正常',
  degraded: '部分服务运行异常',
  down: '部分服务暂时不可用',
  unknown: '暂无法确认服务状态',
  planned: '服务规划中',
}
function periods(item: ContentItem): ServiceStatusPeriod[] {
  const real = detailOf(item).timeline
  if (real?.length) return real
  // Legacy/static sources do not establish a dated history. Keep gaps explicit.
  const step = hours.value === 24 ? 1800000 : hours.value === 168 ? 10800000 : 43200000
  const count = hours.value === 24 ? 48 : hours.value === 168 ? 56 : 60
  const end = Math.floor((lastUpdated.value ?? Date.now()) / step) * step + step
  return Array.from({ length: count }, (_, index) => ({
    startAt: new Date(end - (count - index) * step).toISOString(),
    endAt: new Date(end - (count - index - 1) * step).toISOString(),
    status: 'unknown',
    availability: null,
    samples: 0,
  }))
}
function active(item: ContentItem): ServiceStatusPeriod | undefined {
  return periods(item)[selected.value[item.id] ?? periods(item).length - 1]
}
function date(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function description(period: ServiceStatusPeriod): string {
  const observed = period.samples
    ? `${serviceHealthText(period.status)} · ${period.availability?.toFixed(2)}% · ${period.samples} 次采样`
    : '无采样数据'
  return `${date(period.startAt)} — ${date(period.endAt)} · ${observed}`
}
function availability(item: ContentItem): string {
  const buckets = periods(item).filter((p) => p.samples > 0 && p.availability != null)
  const count = buckets.reduce((sum, p) => sum + p.samples, 0)
  return count
    ? `${(buckets.reduce((sum, p) => sum + p.availability! * p.samples, 0) / count).toFixed(2)}%`
    : '—'
}
</script>

<template>
  <section class="status-panel" aria-label="服务运行状态">
    <header class="status-heading">
      <div>
        <span class="eyebrow">LIVE SYSTEM HEALTH</span>
        <h3><i class="status-dot" :class="`is-${overall}`" />{{ titles[overall] }}</h3>
        <p>最近 {{ windowLabel }} · 每格 {{ bucketLabel }} · 每分钟自动采样（末格进行中）</p>
      </div>
      <select v-model="hours" aria-label="历史时间范围" class="refresh" @change="selected = {}">
        <option :value="24">最近 24 小时</option>
        <option :value="168">最近 7 天</option>
        <option :value="720">最近 30 天</option>
      </select>
      <button v-if="hasSource" class="refresh" type="button" :disabled="loading" @click="refresh">
        {{ loading ? '刷新中…' : '↻ 刷新状态' }}
      </button>
    </header>
    <p v-if="error" class="status-error" role="status">
      状态刷新失败，展示最近一次观测。请稍后重试。
    </p>
    <div class="status-legend">
      <span><i class="status-dot is-up" />正常</span
      ><span><i class="status-dot is-degraded" />部分异常</span
      ><span><i class="status-dot is-down" />故障</span
      ><span><i class="status-dot is-unknown" />无数据</span><small>可用率仅统计已采样时段</small>
    </div>
    <ul class="status-list">
      <li v-for="item in element.items" :key="item.id" class="status-row">
        <div class="service-heading">
          <div>
            <strong>{{ item.title }}</strong
            ><span class="current-state" :class="`is-${detailOf(item).health ?? 'unknown'}`">{{
              serviceHealthText(detailOf(item).health)
            }}</span>
          </div>
          <span class="availability">{{ availability(item) }}<small>已观测可用率</small></span>
        </div>
        <p v-if="item.text" class="service-description">{{ item.text }}</p>
        <div
          :style="{ gridTemplateColumns: `repeat(${periods(item).length}, minmax(0, 1fr))` }"
          class="status-bars"
          :aria-label="`${item.title} 历史状态`"
        >
          <button
            v-for="(period, index) in periods(item)"
            :key="period.startAt"
            type="button"
            class="status-bar"
            :class="[`is-${period.status}`, { selected: selected[item.id] === index }]"
            :title="description(period)"
            :aria-label="description(period)"
            :aria-pressed="selected[item.id] === index"
            @click="selected[item.id] = index"
            @focus="selected[item.id] = index"
          />
        </div>
        <div class="time-axis">
          <span>{{ windowLabel }}前</span
          ><span>{{ date(periods(item)[Math.floor(periods(item).length / 2)]!.startAt) }}</span
          ><span>现在</span>
        </div>
        <p v-if="active(item)" class="period-detail" aria-live="polite">
          {{ description(active(item)!) }}
        </p>
        <p v-if="detailOf(item).checkedAt" class="checked-at">
          最近探测 {{ date(detailOf(item).checkedAt!) }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.status-panel {
  border: 1px solid var(--yuna-gray-100);
  border-radius: 16px;
  background: var(--yuna-surface);
  overflow: hidden;
}
.status-heading {
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 28px;
  background: var(--yuna-gray-50);
}
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
  color: var(--yuna-gray-500);
}
h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  font-size: 20px;
  color: var(--yuna-gray-900);
}
.status-heading > div {
  flex: 1 1 250px;
}
.status-heading p,
.service-description {
  margin: 0;
  font-size: 12px;
  color: var(--yuna-gray-500);
}
.refresh {
  border: 1px solid var(--yuna-gray-200);
  background: var(--yuna-surface);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--yuna-gray-700);
  cursor: pointer;
  white-space: nowrap;
}
.refresh:disabled {
  opacity: 0.5;
  cursor: wait;
}
.status-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--yuna-gray-100);
  font-size: 12px;
  color: var(--yuna-gray-600);
}
.status-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-legend small {
  margin-left: auto;
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--yuna-gray-300);
}
.status-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.status-row {
  min-width: 0;
  padding: 22px 28px;
  border-bottom: 1px solid var(--yuna-gray-100);
}
.status-row:nth-child(odd) {
  border-right: 1px solid var(--yuna-gray-100);
}
.service-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.service-heading > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.service-heading strong {
  font-size: 14px;
  color: var(--yuna-gray-900);
}
.current-state {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--yuna-gray-50);
  color: var(--yuna-gray-600);
}
.availability {
  text-align: right;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: var(--yuna-gray-800);
}
.availability small {
  display: block;
  font-size: 10px;
  color: var(--yuna-gray-500);
  margin-top: 2px;
}
.status-bars {
  display: grid;
  grid-template-columns: repeat(48, minmax(0, 1fr));
  gap: 3px;
  margin-top: 18px;
  height: 28px;
}
.status-bar {
  min-width: 0;
  width: 100%;
  padding: 0;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
  background: var(--yuna-gray-200);
  transition: transform 0.15s;
}
.status-bar:hover,
.status-bar:focus-visible,
.status-bar.selected {
  transform: translateY(-3px);
  outline: 2px solid var(--yuna-gray-700);
  outline-offset: 1px;
}
.status-bar.is-up,
.status-dot.is-up {
  background: var(--yuna-success);
}
.status-bar.is-degraded,
.status-dot.is-degraded {
  background: var(--yuna-warning);
}
.status-bar.is-down,
.status-dot.is-down {
  background: var(--yuna-danger);
}
.status-bar.is-unknown {
  background: repeating-linear-gradient(
    135deg,
    var(--yuna-gray-200),
    var(--yuna-gray-200) 3px,
    var(--yuna-gray-100) 3px,
    var(--yuna-gray-100) 6px
  );
}
.time-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 7px;
  font-size: 10px;
  color: var(--yuna-gray-500);
}
.period-detail {
  margin: 12px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--yuna-gray-600);
  min-height: 18px;
  font-variant-numeric: tabular-nums;
}
.checked-at {
  margin: 3px 0 0;
  font-size: 10px;
  color: var(--yuna-gray-500);
}
.status-error {
  margin: 16px 28px;
  color: var(--yuna-warning);
  font-size: 12px;
}
@media (max-width: 1000px) {
  .status-list {
    grid-template-columns: minmax(0, 1fr);
  }
  .status-row:nth-child(odd) {
    border-right: 0;
  }
}
@media (max-width: 600px) {
  .status-heading,
  .status-row {
    padding: 18px 16px;
  }
  .status-legend {
    padding: 12px 16px;
    gap: 10px;
  }
  h3 {
    font-size: 17px;
  }
  .status-bars {
    gap: 2px;
    height: 24px;
  }
  .status-legend small {
    margin-left: 0;
    width: 100%;
  }
}
</style>
