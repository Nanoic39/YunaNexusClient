<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NAlert, NEmpty, NSpin, useMessage } from 'naive-ui'
import { PageContainer, SectionCard, formatDateTime } from '@yuna/ui'
import { pointsApi, type PointsAccount, type PointsEntry } from '@yuna/core'
import { handleApiError } from '@/utils/handle-error'
const router = useRouter(),
  message = useMessage()
const account = ref<PointsAccount | null>(null),
  entries = ref<PointsEntry[]>([])
const loading = ref(false),
  signing = ref(false),
  moreLoading = ref(false),
  error = ref(''),
  hasMore = ref(false)
let alive = true,
  generation = 0
const abort = new AbortController()
async function load() {
  const version = ++generation
  loading.value = true
  error.value = ''
  try {
    const [summary, rows] = await Promise.all([
      pointsApi.account(abort.signal),
      pointsApi.ledger(0, abort.signal),
    ])
    if (alive && version === generation) {
      account.value = summary
      entries.value = rows
      hasMore.value = rows.length === 20
    }
  } catch (e) {
    if (alive && version === generation) error.value = handleApiError(e, router)
  } finally {
    if (alive && version === generation) loading.value = false
  }
}
async function sign() {
  if (signing.value || !account.value || account.value.checkedInToday) return
  signing.value = true
  try {
    const result = await pointsApi.checkIn()
    if (!alive) return
    account.value = result
    message.success('签到成功，积分已到账')
    await load()
  } catch (e) {
    if (alive) message.error(handleApiError(e, router))
  } finally {
    if (alive) signing.value = false
  }
}
async function more() {
  if (moreLoading.value || loading.value || !hasMore.value || !entries.value.length) return
  const version = generation
  moreLoading.value = true
  try {
    const rows = await pointsApi.ledger(entries.value.at(-1)!.id, abort.signal)
    if (alive && version === generation) {
      entries.value.push(...rows)
      hasMore.value = rows.length === 20
    }
  } catch (e) {
    if (alive) message.error(handleApiError(e, router))
  } finally {
    if (alive) moreLoading.value = false
  }
}
onMounted(() => void load())
onBeforeUnmount(() => {
  alive = false
  generation++
  abort.abort()
})
</script>
<template>
  <page-container title="积分与签到" description="查看积分余额与交易记录，完成每日签到。">
    <template #extra
      ><n-button :loading="loading" :disabled="signing || moreLoading" @click="load"
        >刷新</n-button
      ></template
    >
    <n-alert v-if="error" type="error" class="notice" role="alert"
      >{{ error }} <n-button text @click="load">重试</n-button></n-alert
    >
    <n-spin :show="loading">
      <div v-if="account" class="points-summary">
        <section-card title="可用积分"
          ><strong class="balance">{{ account.balance.toLocaleString() }}</strong>
          <p class="summary-note">各应用共享余额，积分变动后即时更新。</p></section-card
        >
        <section-card title="每日签到"
          ><div class="check-row">
            <div>
              <strong>{{
                account.checkedInToday ? '今日已签到' : `今日可领取 ${account.nextReward} 积分`
              }}</strong>
              <p class="summary-note">连续签到 {{ account.streak }} 天 · {{ account.today }}</p>
            </div>
            <n-button
              type="primary"
              :loading="signing"
              :disabled="loading || account.checkedInToday"
              @click="sign"
              >{{ account.checkedInToday ? '已签到' : '签到领积分' }}</n-button
            >
          </div>
          <details class="reward-rules">
            <summary>查看签到规则</summary>
            <p>
              每日基础 10 分，连续每天额外增加 2 分，额外奖励最高 12
              分。断签后重新累计，按北京时间自然日结算。
            </p>
          </details></section-card
        >
      </div>
      <section-card title="积分明细" description="签到奖励及各应用的积分变动，按时间倒序显示。">
        <n-empty
          v-if="!entries.length && !loading"
          description="暂无积分记录"
          class="ledger-empty"
        />
        <ol v-else class="ledger-list" aria-label="积分交易记录">
          <li v-for="row in entries" :key="row.id" class="ledger-entry">
            <div class="entry-marker" aria-hidden="true">
              {{ row.delta > 0 ? '+' : row.delta < 0 ? '−' : '·' }}
            </div>
            <div class="entry-main">
              <strong>{{
                row.reason || (row.clientCode === '__checkin' ? '每日签到' : '积分变动')
              }}</strong>
              <p>
                <span>{{ row.clientCode === '__checkin' ? '每日签到' : row.clientCode }}</span
                ><time>{{ formatDateTime(row.createdAt) }}</time>
              </p>
            </div>
            <div class="entry-value">
              <strong :class="{ 'is-credit': row.delta > 0 }"
                >{{ row.delta > 0 ? '+' : '' }}{{ row.delta.toLocaleString() }}</strong
              ><small>余额 {{ row.balance.toLocaleString() }}</small>
            </div>
          </li>
        </ol>
        <div v-if="hasMore" class="more">
          <n-button :loading="moreLoading" :disabled="loading" @click="more">加载更早记录</n-button>
        </div>
      </section-card>
    </n-spin>
  </page-container>
</template>
<style scoped>
.points-summary {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
  gap: 16px;
  margin-bottom: 16px;
}
.balance {
  font-size: 32px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.summary-note {
  color: var(--yuna-gray-700);
  font-size: 12px;
  line-height: 1.7;
  margin: 8px 0 0;
}
.check-row {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
}
.check-row > div {
  min-width: 0;
}
.check-row strong {
  font-size: 16px;
  font-weight: 600;
}
.reward-rules {
  color: var(--yuna-gray-700);
  font-size: 12px;
  line-height: 1.7;
  margin-top: 14px;
}
.reward-rules summary {
  cursor: pointer;
  width: fit-content;
}
.reward-rules p {
  margin-bottom: 0;
}
.ledger-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ledger-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid var(--yuna-gray-200);
}
.ledger-entry:last-child {
  border-bottom: 0;
}
.entry-marker {
  width: 32px;
  height: 32px;
  border: 1px solid var(--yuna-gray-200);
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--yuna-gray-700);
  font-size: 18px;
}
.entry-main {
  min-width: 0;
  flex: 1;
}
.entry-main strong {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.entry-main p {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  color: var(--yuna-gray-700);
  font-size: 12px;
  margin: 5px 0 0;
}
.entry-value {
  display: grid;
  text-align: right;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}
.entry-value strong {
  font-size: 16px;
  font-weight: 600;
}
.entry-value .is-credit {
  color: var(--yuna-success);
}
.entry-value small {
  color: var(--yuna-gray-700);
  font-size: 12px;
}
.more {
  text-align: center;
  margin-top: 16px;
}
.notice {
  margin-bottom: 16px;
}
.ledger-empty {
  padding: 32px 0;
}
@media (max-width: 850px) {
  .points-summary {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 500px) {
  .check-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .entry-marker {
    display: none;
  }
  .ledger-entry {
    gap: 10px;
  }
}
</style>
