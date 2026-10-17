<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NAlert, NEmpty, NSpin, NTag, useMessage } from 'naive-ui'
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
  <page-container title="积分与签到" description="一个积分账户，跨应用使用；每天签到积累更多奖励">
    <template #extra
      ><n-button :loading="loading" :disabled="signing || moreLoading" @click="load"
        >刷新</n-button
      ></template
    >
    <n-alert v-if="error" type="error" class="notice"
      >{{ error }} <n-button text @click="load">重试</n-button></n-alert
    >
    <n-spin :show="loading">
      <div v-if="account" class="points-summary">
        <section-card title="可用积分"
          ><strong class="balance">{{ account.balance.toLocaleString() }}</strong>
          <p>各应用共享余额，扣减后即时更新</p></section-card
        >
        <section-card title="每日签到"
          ><div class="check-row">
            <strong>{{ account.checkedInToday ? '今日已签到' : '今天还未签到' }}</strong
            ><n-tag :type="account.checkedInToday ? 'success' : 'default'">{{
              account.today
            }}</n-tag>
          </div>
          <p>最近连续 {{ account.streak }} 天 · 每日基础 10 分</p>
          <n-button
            type="primary"
            :loading="signing"
            :disabled="loading || account.checkedInToday"
            @click="sign"
            >{{ account.checkedInToday ? '明天再来' : '立即签到' }}</n-button
          ></section-card
        >
        <section-card title="连签奖励"
          ><strong class="balance">最高 22 <small>分 / 天</small></strong>
          <p>
            连续每天额外增加 2 分，额外奖励最高 12 分；断签重新累计。按北京时间自然日结算。
          </p></section-card
        >
      </div>
      <section-card title="积分明细" description="签到奖励及各应用积分变更记录">
        <n-empty
          v-if="!entries.length && !loading"
          description="还没有积分记录，先完成今天的签到吧"
        />
        <div v-else class="ledger-scroll">
          <table>
            <caption class="sr-only">
              本人积分变更流水
            </caption>
            <thead>
              <tr>
                <th>时间</th>
                <th>变动</th>
                <th>变动后余额</th>
                <th>来源</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in entries" :key="row.id">
                <td>{{ formatDateTime(row.createdAt) }}</td>
                <td>
                  <n-tag :type="row.delta > 0 ? 'success' : 'warning'"
                    >{{ row.delta > 0 ? '+' : '' }}{{ row.delta }}</n-tag
                  >
                </td>
                <td>{{ row.balance.toLocaleString() }}</td>
                <td>{{ row.clientCode === '__checkin' ? '每日签到' : row.clientCode }}</td>
                <td>{{ row.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
.balance {
  font-size: 36px;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.balance small {
  font-size: 14px;
  font-weight: 400;
}
.points-summary p {
  color: var(--text-color-3, #767c87);
  line-height: 1.8;
  margin: 8px 0 16px;
}
.check-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.ledger-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;
  text-align: left;
}
th,
td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border-color, #e9ebef);
}
td:last-child {
  max-width: 360px;
  overflow-wrap: anywhere;
}
.more {
  text-align: center;
  margin-top: 20px;
}
.notice {
  margin-bottom: 20px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 1100px) {
  .points-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .points-summary > :last-child {
    grid-column: 1/-1;
  }
}
@media (max-width: 640px) {
  .points-summary {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .points-summary > :last-child {
    grid-column: auto;
  }
  .balance {
    font-size: 30px;
  }
}
</style>
