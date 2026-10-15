import type { ContentItem, SiteContent } from './types'

/**
 * 门户内容默认值。
 *
 * 内容取自 YunaNexusServer 的 `README.md` 与 `docs/roadmap.md`，保证用户端首页 /
 * 关于页开箱即有真实信息；后续可在管理端「门户内容」中自行调整或扩展。
 */

/** 模块 / 阶段 / 里程碑状态条目 */
function statusItem(
  id: string,
  title: string,
  status: ContentItem['status'],
  text?: string,
): ContentItem {
  return { id, title, status, text }
}

export const defaultContent: SiteContent = {
  site: {
    name: 'YunaNexus',
    tagline: '综合中控管理平台',
    description: '未来所有业务平台的统一底座 —— 统一身份、权限、文件与审计。',
    version: '0.1.0',
    repositoryUrl: '',
    footerNote: 'Managed By YunaNexus Project',
  },
  pages: [
    /* --------------------------------- 首页 --------------------------------- */
    {
      id: 'page-home',
      path: '/',
      title: '首页',
      description: '',
      nav: true,
      sections: [
        {
          id: 'home-hero',
          title: '',
          elements: [
            {
              id: 'home-hero-el',
              type: 'hero',
              title: 'YunaNexus 综合中控管理平台',
              text: '未来所有业务平台的统一底座。把统一身份、权限、文件与审计收敛到一处，让上层业务专注于业务本身。',
              items: [
                { id: 'hero-cta-console', title: '进入控制台', link: '/console/dashboard' },
                { id: 'hero-cta-about', title: '了解更多', link: '/about' },
              ],
            },
          ],
        },
        {
          id: 'home-services',
          title: '服务运行状态',
          description: '平台各服务的实时运行概况',
          elements: [
            {
              id: 'home-services-el',
              type: 'services',
              // 状态取数：默认走聚合接口（开发环境由 MSW 提供，生产环境请替换为真实地址或留空）
              statusUrl: '/api/v1/status',
              statusIntervalSeconds: 30,
              items: [
                statusItem('svc-gateway', '网关', 'done', '统一入口 · 路由与限流'),
                statusItem('svc-auth', '认证中心', 'done', '登录 / 令牌 / 会话'),
                statusItem('svc-user', '用户中心', 'done', '档案 / 状态 / 锁定'),
                statusItem('svc-permission', '权限中心', 'done', 'RBAC / ABAC 判定'),
                statusItem('svc-file', '文件服务', 'done', '上传 / 下载 / 元数据'),
                statusItem('svc-notice', '通知中心', 'done', '站内信 / 模板 / 投递'),
                statusItem('svc-audit', '审计中心', 'done', '操作日志 / 链路追溯'),
                statusItem('svc-meta', '元数据中心', 'doing', '号段 / 字典（环境联调中）'),
                statusItem('svc-analytics', '行为分析', 'todo', '埋点 / 画像（规划中）'),
              ],
            },
          ],
        },
      ],
    },

        /* -------------------------------- 关于页 -------------------------------- */
    {
      id: 'page-about',
      path: '/about',
      title: '关于',
      description: '了解 YunaNexus 的定位、技术选型、开发进度与团队。',
      nav: true,
      sections: [
        {
          id: 'about-intro',
          title: '项目简介',
          elements: [
            {
              id: 'about-intro-el',
              type: 'text',
              text: 'YunaNexus 是一个综合中控管理平台，定位为未来所有业务平台的统一底座。它把身份、权限、文件、通知与审计等横切能力收敛到一处，避免各业务重复造轮子，并提供统一的管理入口与一致的用户体验。',
              items: [],
            },
          ],
        },
        {
          id: 'about-tech',
          title: '技术选型',
          description: '后端以 Spring 生态为主，前端采用 Vite + Vue 3',
          elements: [
            {
              id: 'about-tech-el',
              type: 'list',
              items: [
                { id: 'tech-backend', title: '后端框架', text: 'Spring Boot 4.0.7 · Spring Cloud 2025.1.0 · Spring Cloud Alibaba 2025.1.0.0' },
                { id: 'tech-registry', title: '服务治理', text: 'Nacos · OpenFeign · Sentinel · RocketMQ' },
                { id: 'tech-data', title: '数据存储', text: 'MySQL 分库分表 · Redis · MyBatis-Plus · Leaf-segment 号段' },
                { id: 'tech-security', title: '安全', text: 'RS256 JWT（kid 轮换）· AES-CTR + HMAC + Base62 外部 ID' },
                { id: 'tech-observability', title: '可观测性', text: 'SkyWalking · Prometheus · Grafana' },
                { id: 'tech-frontend', title: '前端', text: 'Vite 6 · Vue 3.5 · TypeScript · Naive UI · MSW' },
              ],
            },
          ],
        },
        {
          id: 'about-status',
          title: '模块运行状态',
          description: '各能力模块当前进展',
          elements: [
            {
              id: 'about-status-el',
              type: 'timeline',
              items: [
                statusItem('about-mod-meta', '元数据中心', 'doing', '号段生产级完成，Nacos 与主从待环境'),
                statusItem('about-mod-auth', '认证中心', 'doing'),
                statusItem('about-mod-analytics', '行为分析与画像', 'todo'),
                statusItem('about-mod-others', '用户 / 权限 / 文件 / 通知 / 审计', 'done'),
              ],
            },
          ],
        },
        {
          id: 'about-roadmap',
          title: '后续开发规划',
          description: '阶段总览与里程碑',
          elements: [
            {
              id: 'about-roadmap-phases',
              type: 'timeline',
              items: [
                statusItem('about-phase-0', '阶段 0 · 基础设施', 'done'),
                statusItem('about-phase-1', '阶段 1 · 外部 ID', 'done'),
                statusItem('about-phase-2', '阶段 2 · 元数据中心', 'doing', '主从待环境'),
                statusItem('about-phase-3', '阶段 3 · 认证中心', 'done'),
                statusItem('about-phase-4', '阶段 4 · 网关', 'done'),
                statusItem('about-phase-5', '阶段 5 · 用户中心', 'done'),
                statusItem('about-phase-6', '阶段 6 · 权限中心', 'done'),
                statusItem('about-phase-7', '阶段 7 · 文件与通知', 'done'),
                statusItem('about-phase-8', '阶段 8 · 审计中心', 'doing', '当前阶段'),
                statusItem('about-phase-9', '阶段 9 · 可观测性与部署', 'doing'),
                statusItem('about-phase-10', '阶段 10 · 行为分析与画像', 'todo'),
              ],
            },
            {
              id: 'about-roadmap-milestones',
              type: 'list',
              title: '里程碑',
              items: [
                statusItem('ms-1', 'M1 · 基建完成', 'done'),
                statusItem('ms-2', 'M2 · 认证中心可用', 'done'),
                statusItem('ms-3', 'M3 · 网关可用', 'done'),
                statusItem('ms-4', 'M4 · 用户中心可用', 'done'),
                statusItem('ms-5', 'M5 · 权限中心可用', 'done'),
                statusItem('ms-6', 'M6 · 核心闭环', 'done'),
                statusItem('ms-7', 'M7 · 完整系统', 'doing'),
                statusItem('ms-8', 'M8 · 画像分析可用', 'todo'),
              ],
            },
          ],
        },
        {
          id: 'about-members',
          title: '项目组成员',
          description: '项目发起、研发与维护',
          elements: [
            {
              id: 'about-members-el',
              type: 'cards',
              items: [
                {
                  id: 'member-core',
                  title: 'YunaNexus Project Team',
                  text: '核心研发与维护',
                  tags: ['架构设计', '平台研发', '运维部署'],
                },
              ],
            },
          ],
        },
        {
          id: 'about-projects',
          title: '相关项目',
          description: '基于本平台构建的关联项目',
          elements: [
            {
              id: 'about-projects-el',
              type: 'cards',
              items: [
                {
                  id: 'about-project-placeholder',
                  title: '敬请期待',
                  text: '更多关联项目正在筹备中。',
                  tags: ['规划中'],
                  status: 'todo',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
