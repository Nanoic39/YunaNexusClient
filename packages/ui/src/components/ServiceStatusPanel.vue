<script setup lang="ts">
import { computed, ref } from 'vue'
import { useServiceStatus } from '@yuna/core'
import type { ContentElement, ContentItem, ServiceHealth } from '@yuna/core'

/**
 * 服务运行状态图（参考 https://status.deepseek.com）：
 * 顶部整体状态横幅 + 「系统状态」卡片（区间翻页 + 各服务可用性条形图）。
 *
 * 状态取数由 `useServiceStatus` 负责（聚合接口或每服务独立地址），
 * 未配置接口 / 请求失败时回退到条目的静态 `status`，保证始终有可读状态。
 */
const props = defineProps<{ element: ContentElement }>()

const { loading, error, lastUpdated, refresh, detailOf } = useServiceStatus(() => props.element)

/** 条形图窗口天数（约 3 个月，与 DeepSeek 状态页一致） */
const WINDOW_SIZE = 90

/** 整体横幅只关心参与服务的三态（规划中 / 未知不计入） */
type OverallHealth = 'up' | 'degraded' | 'down'

/** 是否配置了任意状态接口 */
const hasSource = computed(
  () => Boolean(props.element.statusUrl?.trim()) || props.element.items.some((item) => item.statusUrl?.trim()),
)

/** 单个服务的完整历史：接口 history 优先；缺省时用当前状态铺成等宽平条，保持版式完整 */
function fullHistory(item: ContentItem): ServiceHealth[] {
  const detail = detailOf(item)
  if (detail.history?.length) return detail.history
  if (detail.health) return Array.from({ length: WINDOW_SIZE }, () => detail.health as ServiceHealth)
  return []
}

/** 是否存在真实历史数据（决定是否显示区间翻页） */
const hasHistory = computed(() => props.element.items.some((item) => detailOf(item).history?.length))

/** 全部服务历史的最大长度 */
const totalDays = computed(() => {
  let max = 0
  for (const item of props.element.items) max = Math.max(max, fullHistory(item).length)
  return max
})

/** 距最新端的偏移（天），用于区间翻页 */
const offset = ref(0)
const canOlder = computed(() => offset.value + WINDOW_SIZE < totalDays.value)
const canNewer = computed(() => offset.value > 0)

function goOlder(): void {
  offset.value = Math.min(offset.value + WINDOW_SIZE, Math.max(0, totalDays.value - WINDOW_SIZE))
}

function goNewer(): void {
  offset.value = Math.max(0, offset.value - WINDOW_SIZE)
}

/** 当前窗口内某服务的每日状态（旧 → 新） */
function barsFor(item: ContentItem): ServiceHealth[] {
  const history = fullHistory(item)
  if (!history.length) return []
  const end = Math.max(0, history.length - offset.value)
  const start = Math.max(0, end - WINDOW_SIZE)
  return history.slice(start, end)
}

function healthOf(item: ContentItem): ServiceHealth | undefined {
  return detailOf(item).health
}

/** 行内状态图标（对应 up / degraded / down / 未知） */
function iconClass(item: ContentItem): string {
  return `is-${healthOf(item) ?? 'unknown'}`
}

function iconGlyph(item: ContentItem): string {
  const health = healthOf(item)
  if (health === 'up') return '✓'
  if (health === 'degraded') return '!'
  if (health === 'down') return '✕'
  return '·'
}

/** 可用性百分比：接口值优先，否则由历史窗口推算（规划中的服务不参与统计） */
function availabilityOf(item: ContentItem): number | undefined {
  const detail = detailOf(item)
  if (detail.availability != null) return detail.availability
  const days = fullHistory(item).filter((h) => h !== 'planned')
  if (!days.length) return undefined
  const score = days.reduce((sum, h) => sum + (h === 'up' ? 1 : h === 'degraded' ? 0.5 : 0), 0)
  return (score / days.length) * 100
}

function availabilityText(item: ContentItem): string {
  const value = availabilityOf(item)
  return value == null ? '—' : `${value.toFixed(2)}% 可用性`
}

/** 整体健康态：任一 down → down；任一 degraded → degraded；否则 up（规划中 / 未知不参与） */
const overall = computed<OverallHealth>(() => {
  let result: OverallHealth = 'up'
  for (const item of props.element.items) {
    const health = healthOf(item)
    if (health === 'down') return 'down'
    if (health === 'degraded') result = 'degraded'
  }
  return result
})

const BANNER: Record<OverallHealth, { title: string; desc: string }> = {
  up: { title: '一切运行正常', desc: '所有系统均按预期运行。' },
  degraded: { title: '部分系统维护中', desc: '部分服务正在维护，可能影响使用体验。' },
  down: { title: '服务暂时不可用', desc: '有服务当前不可用，我们正在处理。' },
}

const banner = computed(() => BANNER[overall.value])

/** 区间文案，如「2026年7月 - 2026年10月」 */
const rangeText = computed(() => {
  const total = totalDays.value
  if (!total || !hasHistory.value) return ''
  const endIndex = Math.max(0, total - offset.value)
  const startIndex = Math.max(0, endIndex - WINDOW_SIZE)
  const dateOf = (index: number): Date => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (total - 1 - index))
    return date
  }
  const format = (date: Date): string => `${date.getFullYear()}年${date.getMonth() + 1}月`
  const start = format(dateOf(startIndex))
  const end = format(dateOf(endIndex - 1))
  return start === end ? start : `${start} - ${end}`
})

const timeText = computed(() => {
  if (error.value) return '状态获取失败'
  if (loading.value) return '获取中…'
  if (lastUpdated.value) {
    const time = new Date(lastUpdated.value).toLocaleTimeString('zh-CN', { hour12: false })
    return `更新于 ${time}`
  }
  return ''
})
</script>

<template>
  <div class="status-panel">
    <!-- 整体状态横幅 -->
    <div class="status-banner" :class="`is-${overall}`">
      <span class="status-banner__icon" aria-hidden="true">{{ overall === 'up' ? '✓' : overall === 'degraded' ? '!' : '✕' }}</span>
      <div class="status-banner__text">
        <strong class="status-banner__title">{{ banner.title }}</strong>
        <p class="status-banner__desc">{{ banner.desc }}</p>
      </div>
    </div>

    <!-- 系统状态 -->
    <section class="status-card">
      <header class="status-card__head">
        <h3 class="status-card__title">系统状态</h3>
        <div class="status-card__tools">
          <div v-if="hasHistory" class="status-nav">
            <button class="status-nav__btn" type="button" :disabled="!canOlder" aria-label="查看更早" @click="goOlder">‹</button>
            <span class="status-nav__range">{{ rangeText }}</span>
            <button class="status-nav__btn" type="button" :disabled="!canNewer" aria-label="查看更新" @click="goNewer">›</button>
          </div>
          <div v-if="hasSource" class="status-refresh" :class="{ 'is-error': Boolean(error) }">
            <span class="status-refresh__time">{{ timeText }}</span>
            <button
              class="status-nav__btn status-refresh__btn"
              type="button"
              :disabled="loading"
              aria-label="刷新状态"
              @click="refresh"
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      <ul class="status-list">
        <li v-for="item in element.items" :key="item.id" class="status-row">
          <div class="status-row__head">
            <span class="status-row__icon" :class="iconClass(item)" aria-hidden="true">{{ iconGlyph(item) }}</span>
            <span class="status-row__name">{{ item.title }}</span>
            <span v-if="item.text" class="status-row__meta">{{ item.text }}</span>
            <span class="status-row__avail">{{ availabilityText(item) }}</span>
          </div>
          <div v-if="barsFor(item).length" class="status-row__bars">
            <span
              v-for="(health, index) in barsFor(item)"
              :key="index"
              class="status-bar"
              :class="`is-${health}`"
            />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.status-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ------------------------------ 整体状态横幅 ------------------------------ */
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 10px;
}

.status-banner.is-up {
  background: rgba(31, 169, 113, 0.1);
}

.status-banner.is-degraded {
  background: rgba(232, 163, 61, 0.14);
}

.status-banner.is-down {
  background: rgba(229, 72, 77, 0.1);
}

.status-banner__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  border-radius: 50%;
}

.status-banner.is-up .status-banner__icon {
  background: var(--yuna-success);
}

.status-banner.is-degraded .status-banner__icon {
  background: var(--yuna-warning);
}

.status-banner.is-down .status-banner__icon {
  background: var(--yuna-danger);
}

.status-banner__title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--yuna-gray-900);
}

.status-banner__desc {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--yuna-gray-600);
}

/* -------------------------------- 系统状态卡片 -------------------------------- */
.status-card {
  overflow: hidden;
  background: var(--yuna-surface);
  border: 1px solid var(--yuna-gray-100);
  border-radius: 10px;
}

.status-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--yuna-gray-50);
  border-bottom: 1px solid var(--yuna-gray-100);
}

.status-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.status-card__tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 区间翻页 */
.status-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-nav__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 16px;
  line-height: 1;
  color: var(--yuna-gray-600);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--yuna-radius-md);
  transition: background 0.15s ease, color 0.15s ease;
}

.status-nav__btn:hover:not(:disabled) {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-200);
}

.status-nav__btn:disabled {
  cursor: default;
  opacity: 0.35;
}

.status-nav__range {
  min-width: 148px;
  font-size: 13px;
  color: var(--yuna-gray-600);
  text-align: center;
}

/* 刷新 */
.status-refresh {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--yuna-gray-500);
}

.status-refresh.is-error .status-refresh__time {
  color: var(--yuna-danger);
}

.status-refresh__btn {
  font-size: 14px;
}

/* -------------------------------- 服务列表 -------------------------------- */
.status-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.status-row {
  padding: 16px 18px;
  border-bottom: 1px solid var(--yuna-gray-100);
}

.status-row:last-child {
  border-bottom: none;
}

.status-row__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.status-row__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  border-radius: 50%;
}

.status-row__icon.is-up {
  background: var(--yuna-success);
}

.status-row__icon.is-degraded {
  background: var(--yuna-warning);
}

.status-row__icon.is-down {
  background: var(--yuna-danger);
}

.status-row__icon.is-planned,
.status-row__icon.is-unknown {
  background: var(--yuna-gray-300);
}

.status-row__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.status-row__meta {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--yuna-gray-500);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-row__avail {
  margin-left: auto;
  padding-left: 12px;
  font-size: 13px;
  color: var(--yuna-gray-600);
  white-space: nowrap;
}

/* 每日状态条形图 */
.status-row__bars {
  display: flex;
  gap: 2px;
  align-items: stretch;
  height: 16px;
}

.status-bar {
  flex: 1 1 0;
  min-width: 1px;
  border-radius: 2px;
}

.status-bar.is-up {
  background: var(--yuna-success);
}

.status-bar.is-degraded {
  background: var(--yuna-warning);
}

.status-bar.is-down {
  background: var(--yuna-danger);
}

.status-bar.is-planned {
  background: var(--yuna-gray-200);
}

@media (max-width: 768px) {
  .status-card__head {
    padding: 12px 14px;
  }

  .status-row {
    padding: 14px;
  }

  .status-row__meta {
    display: none;
  }

  .status-nav__range {
    min-width: 0;
  }
}
</style>
