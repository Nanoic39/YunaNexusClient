<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NTag } from 'naive-ui'
import type { ContentElement, ContentItem, ContentItemStatus, ContentSection } from '@yuna/core'
import MetricCard from './MetricCard.vue'
import ServiceStatusPanel from './ServiceStatusPanel.vue'

/**
 * 内容渲染器：把「区块（Section）」这一通用数据结构渲染为门户页面。
 *
 * 用户端首页 / 关于页 / 自定义页均由 `siteContent` 驱动，本组件负责把元素的
 * `type`（hero / text / list / metrics / cards / links / timeline / services / divider）
 * 映射为对应的视觉呈现，是内容系统的唯一渲染出口。
 *
 * 链接处理：`http(s)://` 开头视为外链（新窗口打开），其余视为站内路由，
 * 通过 `navigate` 事件交由调用方处理，保持组件与路由解耦。
 */
interface Props {
  section: ContentSection
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

/** 含 hero 元素时整节铺开呈现，不加卡片边框 */
const isHero = computed(() => props.section.elements.some((el) => el.type === 'hero'))

const STATUS_TEXT: Record<ContentItemStatus, string> = {
  done: '已完成',
  doing: '进行中',
  todo: '待开发',
}

function statusText(status?: ContentItemStatus): string {
  return status ? STATUS_TEXT[status] : ''
}

/** 服务运行状态图由 `ServiceStatusPanel` 独立渲染（含实时取数） */

function onLink(link?: string): void {
  if (!link) return
  if (/^https?:\/\//i.test(link)) {
    window.open(link, '_blank', 'noopener,noreferrer')
    return
  }
  emit('navigate', link)
}

function hasLink(item: ContentItem): boolean {
  return Boolean(item.link)
}

function onItemClick(item: ContentItem): void {
  if (hasLink(item)) onLink(item.link)
}

function elementHeading(el: ContentElement): boolean {
  return Boolean(el.title) && el.type !== 'hero'
}
</script>

<template>
  <section class="content-section" :class="{ 'content-section--hero': isHero }">
    <header v-if="section.title || section.description" class="content-section__head">
      <h2 v-if="section.title" class="content-section__title">{{ section.title }}</h2>
      <p v-if="section.description" class="content-section__desc">{{ section.description }}</p>
    </header>

    <div class="content-section__body" :class="{ 'is-hero': isHero }">
      <template v-for="el in section.elements" :key="el.id">
        <!-- Hero：主标题 + 说明 + 行动按钮 -->
        <div v-if="el.type === 'hero'" class="el-hero">
          <div class="el-hero__glow" aria-hidden="true" />
          <div class="el-hero__inner">
            <h1 v-if="el.title" class="el-hero__title">{{ el.title }}</h1>
            <p v-if="el.text" class="el-hero__text">{{ el.text }}</p>
            <div v-if="el.items.length" class="el-hero__actions">
              <n-button
                v-for="(item, index) in el.items"
                :key="item.id"
                size="large"
                :type="index === 0 && item.link !== '/about' ? 'primary' : 'default'"
                :secondary="index !== 0"
                @click="onItemClick(item)"
              >
                {{ item.title }}
              </n-button>
            </div>
          </div>
        </div>

        <!-- 纯文本段 -->
        <div v-else-if="el.type === 'text'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <p class="el-text">{{ el.text }}</p>
        </div>

        <!-- 定义清单：左标题 + 右说明 -->
        <div v-else-if="el.type === 'list'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <dl class="el-list">
            <div v-for="item in el.items" :key="item.id" class="el-list__row">
              <dt class="el-list__title">{{ item.title }}</dt>
              <dd class="el-list__text">
                <span>{{ item.text }}</span>
                <span v-if="item.status" class="el-badge" :class="`is-${item.status}`">{{
                  statusText(item.status)
                }}</span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- 指标：复用 MetricCard -->
        <div v-else-if="el.type === 'metrics'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <div class="yuna-metric-grid">
            <metric-card
              v-for="item in el.items"
              :key="item.id"
              :label="item.title ?? '—'"
              :value="item.value ?? '—'"
              :unit="item.unit"
            />
          </div>
        </div>

        <!-- 卡片网格 -->
        <div v-else-if="el.type === 'cards'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <div class="el-cards">
            <article
              v-for="item in el.items"
              :key="item.id"
              class="el-card"
              :class="{ 'is-clickable': hasLink(item) }"
              :role="hasLink(item) ? 'link' : undefined"
              :tabindex="hasLink(item) ? 0 : undefined"
              @click="onItemClick(item)"
              @keydown.enter.prevent="onItemClick(item)"
              @keydown.space.prevent="onItemClick(item)"
            >
              <div class="el-card__top">
                <h3 class="el-card__title">{{ item.title }}</h3>
                <span v-if="item.status" class="el-badge" :class="`is-${item.status}`">{{
                  statusText(item.status)
                }}</span>
              </div>
              <p v-if="item.text" class="el-card__text">{{ item.text }}</p>
              <div v-if="item.tags?.length" class="el-card__tags">
                <n-tag v-for="tag in item.tags" :key="tag" size="small" :bordered="false">
                  {{ tag }}
                </n-tag>
              </div>
              <span v-if="hasLink(item)" class="el-card__link">查看详情 →</span>
            </article>
          </div>
        </div>

        <!-- 链接组 -->
        <div v-else-if="el.type === 'links'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <div class="el-links">
            <button
              v-for="item in el.items"
              :key="item.id"
              type="button"
              class="el-link"
              @click="onItemClick(item)"
            >
              <span class="el-link__title">{{ item.title }}</span>
              <span v-if="item.text" class="el-link__text">{{ item.text }}</span>
            </button>
          </div>
        </div>

        <!-- 时间线（进度 / 规划） -->
        <div v-else-if="el.type === 'timeline'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <ol class="el-timeline">
            <li
              v-for="item in el.items"
              :key="item.id"
              class="el-timeline__item"
              :class="`is-${item.status ?? 'todo'}`"
            >
              <span class="el-timeline__dot" aria-hidden="true" />
              <div class="el-timeline__main">
                <div class="el-timeline__row">
                  <span class="el-timeline__title">{{ item.title }}</span>
                  <span v-if="item.status" class="el-badge" :class="`is-${item.status}`">{{
                    statusText(item.status)
                  }}</span>
                </div>
                <p v-if="item.text" class="el-timeline__text">{{ item.text }}</p>
              </div>
            </li>
          </ol>
        </div>

        <!-- 服务运行状态图：概览 + 服务节点网格（含实时取数，见 ServiceStatusPanel） -->
        <div v-else-if="el.type === 'services'" class="el-block">
          <h3 v-if="elementHeading(el)" class="el-title">{{ el.title }}</h3>
          <ServiceStatusPanel :element="el" />
        </div>

        <hr v-else-if="el.type === 'divider'" class="el-divider" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.content-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: var(--yuna-card-bg);
  border: var(--yuna-card-border);
  border-radius: var(--yuna-radius-card);
  box-shadow: var(--yuna-card-shadow);
}

.content-section--hero {
  gap: 0;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.content-section__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.content-section__title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--yuna-gray-900);
}

.content-section__desc {
  font-size: 13px;
  color: var(--yuna-gray-600);
}

.content-section__body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* --------------------------------- Hero --------------------------------- */

.el-hero {
  position: relative;
  overflow: hidden;
  padding: 28px;
  background: var(--yuna-surface);
  border: var(--yuna-card-border);
  border-left: 3px solid var(--yuna-primary);
  border-radius: var(--yuna-radius-lg);
}

.el-hero__glow {
  display: none;
}

.el-hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 880px;
}

.el-hero__title {
  font-size: clamp(24px, 2.5vw, 30px);
  font-weight: 600;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--yuna-gray-900);
}

.el-hero__text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--yuna-gray-700);
}

.el-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

/* ------------------------------- 通用元素 ------------------------------- */

.el-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.el-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.el-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--yuna-gray-700);
}

/* 状态徽标 */
.el-badge {
  flex: 0 0 auto;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 18px;
  border-radius: 999px;
}

.el-badge.is-done {
  color: var(--yuna-success);
  background: rgba(31, 169, 113, 0.1);
}

.el-badge.is-doing {
  color: var(--yuna-blue-700);
  background: var(--yuna-blue-50);
}

.el-badge.is-todo {
  color: var(--yuna-gray-600);
  background: var(--yuna-gray-100);
}

/* 定义清单 */
.el-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
}

.el-list__row {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--yuna-gray-100);
}

.el-list__row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.el-list__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.el-list__text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--yuna-gray-700);
}

/* 卡片网格 */
.el-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.el-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  background: var(--yuna-gray-50);
  border: 1px solid var(--yuna-gray-200);
  border-radius: var(--yuna-radius-lg);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.el-card.is-clickable {
  cursor: pointer;
}

.el-card.is-clickable:hover {
  background: var(--yuna-surface);
  border-color: var(--yuna-blue-300);
}

.el-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.el-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--yuna-gray-900);
}

.el-card__text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--yuna-gray-700);
}

.el-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.el-card__link {
  margin-top: 2px;
  font-size: 12px;
  color: var(--yuna-primary);
}

/* 链接组 */
.el-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.el-link {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  background: var(--yuna-gray-50);
  border: 1px solid var(--yuna-gray-200);
  border-radius: var(--yuna-radius-md);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.el-link:hover {
  background: var(--yuna-surface);
  border-color: var(--yuna-blue-300);
}

.el-link__title {
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.el-link__text {
  color: var(--yuna-gray-600);
}

/* 时间线 */
.el-timeline {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.el-timeline__item {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 16px;
}

.el-timeline__item:last-child {
  padding-bottom: 0;
}

.el-timeline__item::before {
  position: absolute;
  top: 16px;
  bottom: 0;
  left: 5px;
  width: 1px;
  content: '';
  background: var(--yuna-gray-200);
}

.el-timeline__item:last-child::before {
  display: none;
}

.el-timeline__dot {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  background: var(--yuna-gray-300);
  border-radius: 50%;
}

.el-timeline__item.is-done .el-timeline__dot {
  background: var(--yuna-success);
}

.el-timeline__item.is-doing .el-timeline__dot {
  background: var(--yuna-blue-500);
  box-shadow: 0 0 0 3px var(--yuna-blue-100);
}

.el-timeline__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.el-timeline__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.el-timeline__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--yuna-gray-900);
}

.el-timeline__text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--yuna-gray-600);
}

.el-divider {
  height: 0;
  margin: 0;
  border: none;
  border-top: 1px solid var(--yuna-gray-200);
}

@media (max-width: 720px) {
  .el-hero {
    padding: 32px 24px;
  }

  .el-hero__title {
    font-size: 26px;
  }

  .el-list__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
