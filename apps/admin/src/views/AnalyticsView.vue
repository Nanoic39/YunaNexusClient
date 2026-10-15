<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NTag, useMessage } from 'naive-ui'
import { PageContainer, PageEmpty, SectionCard } from '@yuna/ui'
import { analyticsApi } from '@yuna/core'
import type { FunnelResult, RetentionResult, SegmentResult, UserProfileResult } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'

/**
 * 数据分析页。
 *
 * 对接契约 §8.2 的四类分析接口；阶段 10.4 真实查询落地前服务端返回空结果占位，
 * 页面据空数据渲染空态，生产环境不做 Mock 兜底。
 */
const router = useRouter()
const message = useMessage()

const stepsInput = ref('register,login,file.upload,file.share')
const cohortInput = ref('register')
const conditionInput = ref('login >= 3')
const userIdInput = ref('10001')

const funnel = ref<FunnelResult | null>(null)
const retention = ref<RetentionResult | null>(null)
const segment = ref<SegmentResult | null>(null)
const profile = ref<UserProfileResult | null>(null)

const funnelLoading = ref(false)
const retentionLoading = ref(false)
const segmentLoading = ref(false)
const profileLoading = ref(false)

/** 漏斗首步人数，用于计算各步转化率与条宽 */
const funnelBase = computed(() => funnel.value?.steps[0]?.users ?? 0)

function rateText(rate: number | null): string {
  return rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(1)}%`
}

/** 留存热力格：以留存率驱动背景透明度 */
function cellStyle(rate: number | null): Record<string, string> {
  if (rate === null || rate === undefined) return {}
  const alpha = 0.12 + Math.min(Math.max(rate, 0), 1) * 0.78
  return {
    background: `rgba(46, 143, 196, ${alpha.toFixed(3)})`,
    color: rate > 0.55 ? '#ffffff' : 'var(--yuna-gray-900)',
  }
}

async function loadFunnel(): Promise<void> {
  const steps = stepsInput.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  funnelLoading.value = true
  try {
    funnel.value = steps.length ? await analyticsApi.funnel(steps) : { steps: [] }
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    funnelLoading.value = false
  }
}

async function loadRetention(): Promise<void> {
  const cohort = cohortInput.value.trim()
  retentionLoading.value = true
  try {
    retention.value = cohort ? await analyticsApi.retention(cohort) : { periods: [], rows: [] }
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    retentionLoading.value = false
  }
}

async function loadSegment(): Promise<void> {
  const condition = conditionInput.value.trim()
  segmentLoading.value = true
  try {
    segment.value = condition ? await analyticsApi.segments(condition) : { userIds: [], total: 0 }
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    segmentLoading.value = false
  }
}

async function loadProfile(): Promise<void> {
  const userId = Number(userIdInput.value)
  if (!Number.isFinite(userId) || userId <= 0) {
    message.warning('请输入有效的用户 ID')
    return
  }
  profileLoading.value = true
  try {
    profile.value = await analyticsApi.profile(userId)
  } catch (error) {
    message.error(handleApiError(error, router))
  } finally {
    profileLoading.value = false
  }
}

function refreshAll(): void {
  void loadFunnel()
  void loadRetention()
  void loadSegment()
  void loadProfile()
}

onMounted(refreshAll)
</script>

<template>
  <page-container title="数据分析" description="行为埋点的漏斗、留存、分群与单用户画像">
    <template #extra>
      <n-button
        quaternary
        :loading="funnelLoading || retentionLoading || segmentLoading || profileLoading"
        @click="refreshAll"
      >
        刷新
      </n-button>
    </template>

    <section-card title="漏斗分析" description="按步骤顺序统计各环节到达人数">
      <template #extra>
        <n-input
          v-model:value="stepsInput"
          size="small"
          style="width: 260px"
          placeholder="事件名，逗号分隔"
        />
        <n-button size="small" type="primary" :loading="funnelLoading" @click="loadFunnel">
          查询
        </n-button>
      </template>

      <div v-if="funnel && funnel.steps.length" class="funnel">
        <div v-for="(step, index) in funnel.steps" :key="step.step" class="funnel__row">
          <span class="funnel__name">{{ step.step }}</span>
          <div class="funnel__track">
            <div
              class="funnel__bar"
              :style="{ width: `${funnelBase ? (step.users / funnelBase) * 100 : 0}%` }"
            />
          </div>
          <span class="funnel__value">{{ step.users }}</span>
          <span class="funnel__rate">
            {{ index === 0 ? '100%' : rateText(funnelBase ? step.users / funnelBase : null) }}
          </span>
        </div>
      </div>
      <page-empty v-else description="暂无漏斗数据" />
    </section-card>

    <section-card title="留存分析" description="按同期群统计各周期留存率">
      <template #extra>
        <n-input
          v-model:value="cohortInput"
          size="small"
          style="width: 180px"
          placeholder="起始事件名"
        />
        <n-button size="small" type="primary" :loading="retentionLoading" @click="loadRetention">
          查询
        </n-button>
      </template>

      <div v-if="retention && retention.rows.length" class="retention">
        <div
          class="retention__grid"
          :style="{
            gridTemplateColumns: `120px repeat(${retention.periods.length}, minmax(72px, 1fr))`,
          }"
        >
          <div class="retention__cell retention__cell--head">同期群</div>
          <div
            v-for="period in retention.periods"
            :key="period"
            class="retention__cell retention__cell--head"
          >
            {{ period }}
          </div>

          <template v-for="row in retention.rows" :key="row.cohort">
            <div class="retention__cell retention__cell--cohort">{{ row.cohort }}</div>
            <div
              v-for="(rate, index) in row.rates"
              :key="`${row.cohort}-${index}`"
              class="retention__cell retention__cell--rate"
              :style="cellStyle(rate)"
            >
              {{ rateText(rate) }}
            </div>
          </template>
        </div>
      </div>
      <page-empty v-else description="暂无留存数据" />
    </section-card>

    <section-card title="用户分群" description="按条件表达式筛选命中用户">
      <template #extra>
        <n-input
          v-model:value="conditionInput"
          size="small"
          style="width: 220px"
          placeholder="如 login >= 3"
        />
        <n-button size="small" type="primary" :loading="segmentLoading" @click="loadSegment">
          查询
        </n-button>
      </template>

      <div v-if="segment && segment.total" class="segment">
        <div class="segment__summary">
          命中 <strong>{{ segment.total }}</strong> 位用户
        </div>
        <div class="segment__list">
          <n-tag v-for="id in segment.userIds" :key="id" :bordered="false" size="small">
            {{ id }}
          </n-tag>
        </div>
      </div>
      <page-empty v-else description="暂无命中用户" />
    </section-card>

    <section-card title="用户画像" description="查看单个用户的标签、事件计数与价值分层">
      <template #extra>
        <n-input
          v-model:value="userIdInput"
          size="small"
          style="width: 140px"
          placeholder="用户 ID"
        />
        <n-button size="small" type="primary" :loading="profileLoading" @click="loadProfile">
          查询
        </n-button>
      </template>

      <div v-if="profile" class="profile">
        <div class="profile__head">
          <span class="profile__id">用户 {{ profile.userId }}</span>
          <n-tag type="info" :bordered="false" size="small">
            {{ profile.valueTier || '未知' }}
          </n-tag>
        </div>

        <div class="profile__block">
          <h4 class="profile__label">标签</h4>
          <div v-if="profile.tags.length" class="profile__tags">
            <n-tag v-for="tag in profile.tags" :key="tag" :bordered="false" size="small">
              {{ tag }}
            </n-tag>
          </div>
          <span v-else class="profile__muted">暂无标签</span>
        </div>

        <div class="profile__block">
          <h4 class="profile__label">事件计数</h4>
          <div v-if="Object.keys(profile.eventCounts).length" class="profile__events">
            <div v-for="(count, name) in profile.eventCounts" :key="name" class="profile__event">
              <span class="profile__event-name">{{ name }}</span>
              <span class="profile__event-count">{{ count }}</span>
            </div>
          </div>
          <span v-else class="profile__muted">暂无事件记录</span>
        </div>
      </div>
      <page-empty v-else description="请输入用户 ID 查询画像" />
    </section-card>
  </page-container>
</template>

<style scoped>
/* ---------------------------------- 漏斗 ---------------------------------- */
.funnel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.funnel__row {
  display: grid;
  grid-template-columns: 140px 1fr 72px 72px;
  align-items: center;
  gap: 12px;
}

.funnel__name {
  font-size: 13px;
  color: var(--yuna-gray-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.funnel__track {
  height: 18px;
  background: var(--yuna-gray-100);
  border-radius: 4px;
  overflow: hidden;
}

.funnel__bar {
  height: 100%;
  min-width: 2px;
  background: var(--yuna-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.funnel__value,
.funnel__rate {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.funnel__value {
  color: var(--yuna-gray-900);
}

.funnel__rate {
  color: var(--yuna-gray-600);
}

/* ---------------------------------- 留存 ---------------------------------- */
.retention {
  overflow-x: auto;
}

.retention__grid {
  display: grid;
  gap: 4px;
  min-width: max-content;
}

.retention__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 0 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  border-radius: 4px;
}

.retention__cell--head {
  color: var(--yuna-gray-600);
  font-weight: 500;
}

.retention__cell--cohort {
  justify-content: flex-start;
  color: var(--yuna-gray-700);
  background: var(--yuna-gray-50);
}

.retention__cell--rate {
  color: var(--yuna-gray-900);
  background: var(--yuna-gray-50);
}

/* ---------------------------------- 分群 ---------------------------------- */
.segment {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.segment__summary {
  font-size: 13px;
  color: var(--yuna-gray-700);
}

.segment__summary strong {
  color: var(--yuna-gray-900);
  font-size: 15px;
}

.segment__list,
.profile__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ---------------------------------- 画像 ---------------------------------- */
.profile {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.profile__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile__id {
  font-size: 15px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.profile__block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--yuna-gray-600);
}

.profile__events {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 420px;
}

.profile__event {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--yuna-gray-50);
  border-radius: 6px;
}

.profile__event-name {
  font-size: 13px;
  color: var(--yuna-gray-700);
}

.profile__event-count {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--yuna-gray-900);
}

.profile__muted {
  font-size: 13px;
  color: var(--yuna-gray-500);
}
</style>
