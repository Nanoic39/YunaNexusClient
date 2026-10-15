import type {
  AdminUserView,
  AppealView,
  AuditLogView,
  DeptView,
  FileView,
  MenuView,
  NoticeRecordView,
  NoticeTemplateView,
  PermissionView,
  RoleBrief,
  RoleView,
  UserBadge,
  UserProfileView,
  UserTag,
} from '../types'

/**
 * Mock 数据集。
 *
 * 仅用于本地开发与演示：字段与后端 `domain/*View` 对齐，便于在真实网关可用时
 * 无差别切换。数据在内存中可被 handler 就地修改（启用/禁用、标记已读等）。
 */

function dt(offsetMinutes: number): string {
  const base = Date.UTC(2026, 9, 13, 12, 0, 0)
  const d = new Date(base + offsetMinutes * 60_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export const mockUsers: AdminUserView[] = [
  {
    userId: 10001,
    externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
    username: 'alice',
    email: 'alice@example.com',
    mobileCountry: '86',
    mobile: '13800000001',
    status: 1,
    lockedUntil: null,
    lockReason: null,
    failCount: 0,
    lastLoginTime: dt(-30),
    lastLoginIp: '10.12.3.41',
    createTime: dt(-60 * 24 * 30),
    updateTime: dt(-30),
  },
  {
    userId: 10002,
    externalId: 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6',
    username: 'bob',
    email: 'bob@example.com',
    mobileCountry: '86',
    mobile: '13800000002',
    status: 1,
    lockedUntil: null,
    lockReason: null,
    failCount: 0,
    lastLoginTime: dt(-120),
    lastLoginIp: '10.12.3.55',
    createTime: dt(-60 * 24 * 25),
    updateTime: dt(-120),
  },
  {
    userId: 10003,
    externalId: 'q9W8e7R6t5Y4u3I2o1P0aS9d8F7g6H5j',
    username: 'carol',
    email: 'carol@example.com',
    mobileCountry: '86',
    mobile: '13800000003',
    status: 0,
    lockedUntil: null,
    lockReason: null,
    failCount: 5,
    lastLoginTime: dt(-60 * 24 * 3),
    lastLoginIp: '10.12.4.10',
    createTime: dt(-60 * 24 * 20),
    updateTime: dt(-60 * 24 * 3),
  },
  {
    userId: 10004,
    externalId: 'z1X2c3V4b5N6m7Q8w9E0r1T2y3U4i5O6',
    username: 'david',
    email: 'david@example.com',
    mobileCountry: '86',
    mobile: '13800000004',
    status: 1,
    lockedUntil: dt(-60 * 12),
    lockReason: '连续登录失败超过阈值',
    failCount: 8,
    lastLoginTime: dt(-60 * 24 * 2),
    lastLoginIp: '10.12.4.22',
    createTime: dt(-60 * 24 * 18),
    updateTime: dt(-60 * 12),
  },
  {
    userId: 10005,
    externalId: 'p0O9i8U7y6T5r4E3w2Q1aS9d8F7g6H5j',
    username: 'erin',
    email: 'erin@example.com',
    mobileCountry: '86',
    mobile: '13800000005',
    status: 1,
    lockedUntil: null,
    lockReason: null,
    failCount: 0,
    lastLoginTime: dt(-45),
    lastLoginIp: '10.12.5.7',
    createTime: dt(-60 * 24 * 12),
    updateTime: dt(-45),
  },
  {
    userId: 10006,
    externalId: 'm3N4o5P6a1B2c3D4e5F6g7H8i9J0k1L2',
    username: 'frank',
    email: null,
    mobileCountry: '86',
    mobile: '13800000006',
    status: 1,
    lockedUntil: null,
    lockReason: null,
    failCount: 0,
    lastLoginTime: null,
    lastLoginIp: null,
    createTime: dt(-60 * 24 * 5),
    updateTime: dt(-60 * 24 * 5),
  },
]

export const mockAppeals: AppealView[] = [
  {
    id: 2001,
    userId: 10004,
    username: 'david',
    appealReason: '出差期间连续输错密码导致账号锁定，申请解锁。',
    contact: 'david@example.com',
    status: 0,
    auditor: null,
    auditRemark: null,
    auditTime: null,
    createTime: dt(-60 * 10),
    updateTime: dt(-60 * 10),
  },
  {
    id: 2002,
    userId: 10003,
    username: 'carol',
    appealReason: '账号被误判为异常登录，实际为我本人操作。',
    contact: '13800000003',
    status: 0,
    auditor: null,
    auditRemark: null,
    auditTime: null,
    createTime: dt(-60 * 26),
    updateTime: dt(-60 * 26),
  },
  {
    id: 2003,
    userId: 10001,
    username: 'alice',
    appealReason: '密码泄露后主动锁定，现已重置，申请解锁。',
    contact: 'alice@example.com',
    status: 1,
    auditor: 'admin',
    auditRemark: '人工复核通过',
    auditTime: dt(-60 * 24 * 2),
    createTime: dt(-60 * 24 * 3),
    updateTime: dt(-60 * 24 * 2),
  },
  {
    id: 2004,
    userId: 10002,
    username: 'bob',
    appealReason: '误操作导致锁定，请求解锁。',
    contact: 'bob@example.com',
    status: 2,
    auditor: 'admin',
    auditRemark: '未通过身份核验',
    auditTime: dt(-60 * 24 * 4),
    createTime: dt(-60 * 24 * 5),
    updateTime: dt(-60 * 24 * 4),
  },
]

export const mockRoles: RoleView[] = [
  {
    id: 1,
    roleCode: 'admin',
    roleName: '超级管理员',
    description: '平台最高权限，可管理全部资源',
    dataScope: 1,
    status: 1,
    createTime: dt(-60 * 24 * 90),
    updateTime: dt(-60 * 24 * 10),
  },
  {
    id: 2,
    roleCode: 'ops',
    roleName: '运维工程师',
    description: '负责服务运维与审计排查',
    dataScope: 3,
    status: 1,
    createTime: dt(-60 * 24 * 80),
    updateTime: dt(-60 * 24 * 8),
  },
  {
    id: 3,
    roleCode: 'auditor',
    roleName: '审计员',
    description: '仅可查看审计日志与报表',
    dataScope: 2,
    status: 1,
    createTime: dt(-60 * 24 * 70),
    updateTime: dt(-60 * 24 * 6),
  },
  {
    id: 4,
    roleCode: 'user',
    roleName: '普通用户',
    description: '默认角色，仅可访问本人数据',
    dataScope: 4,
    status: 1,
    createTime: dt(-60 * 24 * 60),
    updateTime: dt(-60 * 24 * 60),
  },
  {
    id: 5,
    roleCode: 'guest',
    roleName: '访客',
    description: '只读演示账号',
    dataScope: 5,
    status: 0,
    createTime: dt(-60 * 24 * 30),
    updateTime: dt(-60 * 24 * 20),
  },
]

/** 演示账号绑定的角色：持有根角色 `admin`，用于演示用户端「进入管理后台」入口 */
export const mockCurrentUserRoles: RoleBrief[] = [
  { id: 1, roleCode: 'admin', roleName: '超级管理员' },
]

/** 用户中心 · 演示账号（userId=10001 / alice）的资料（GET/PUT /api/v1/user/profile） */
export const mockUserProfiles: Record<number, UserProfileView> = {
  10001: {
    userId: 10001,
    shardIndex: 9,
    externalId: 'k7Qm9xZ2vL4pR8wT5nB3dF6hJ1sA2cE4g',
    username: 'alice',
    nickname: 'Alice',
    avatar: null,
    email: 'alice@example.com',
    // 手机号功能当前默认关闭：演示账号未绑定手机号
    mobileCountry: null,
    mobile: null,
    status: 1,
    createTime: dt(-60 * 24 * 30),
    updateTime: dt(-30),
  },
}

/** 用户中心 · 演示账号标签（GET/PUT /api/v1/user/tags，覆盖式） */
export const mockUserTags: Record<number, UserTag[]> = {
  10001: [
    { tagCode: 'frontend', tagName: '前端', color: '#4F46E5' },
    { tagCode: 'vue', tagName: 'Vue', color: '#10B981' },
  ],
}

/** 用户中心 · 演示账号徽章（GET /api/v1/user/badges，只读） */
export const mockUserBadges: Record<number, UserBadge[]> = {
  10001: [
    {
      badgeCode: 'EARLY_BIRD',
      badgeName: '早起鸟',
      badgeLevel: 1,
      description: '连续 7 天登录',
      icon: null,
      grantedTime: dt(-60 * 24 * 10),
    },
    {
      badgeCode: 'SECURITY_GUARD',
      badgeName: '安全卫士',
      badgeLevel: 2,
      description: '开启全部安全设置并完成首次改密',
      icon: null,
      grantedTime: dt(-60 * 24 * 3),
    },
  ],
}

export const mockPermissions: PermissionView[] = [
  { id: 101, permCode: 'auth:user:list', resource: '/api/v1/auth/admin/users', action: 'read', description: '查询用户列表', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
  { id: 102, permCode: 'auth:user:write', resource: '/api/v1/auth/admin/users/**', action: 'write', description: '管理用户状态', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
  { id: 103, permCode: 'permission:role:manage', resource: '/api/v1/permission/admin/roles/**', action: '*', description: '角色与绑定管理', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
  { id: 104, permCode: 'audit:log:read', resource: '/api/v1/audit/logs', action: 'read', description: '审计日志查看', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
  { id: 105, permCode: 'file:upload', resource: '/api/v1/file/upload', action: 'write', description: '文件上传', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
  { id: 106, permCode: 'notice:portal:manage', resource: '/api/v1/notice/portal/admin/**', action: '*', description: '门户内容管理', status: 1, createTime: dt(-60 * 24 * 60), updateTime: dt(-60 * 24 * 60) },
]

/** 菜单（扁平结构；管理端树由前端组装，接口 /menus/tree 由 handler 组装返回） */
export const mockMenus: MenuView[] = [
  { id: 1, menuCode: 'dashboard', menuName: '概览', parentId: 0, path: '/dashboard', sort: 1, status: 1, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 30) },
  { id: 2, menuCode: 'system', menuName: '系统管理', parentId: 0, path: '/system', sort: 2, status: 1, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 30) },
  { id: 21, menuCode: 'system.user', menuName: '用户管理', parentId: 2, path: '/system/users', sort: 1, status: 1, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 30) },
  { id: 22, menuCode: 'system.role', menuName: '角色权限', parentId: 2, path: '/system/roles', sort: 2, status: 1, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 30) },
  { id: 23, menuCode: 'system.appeal', menuName: '申诉审核', parentId: 2, path: '/system/appeals', sort: 3, status: 1, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 30) },
  { id: 24, menuCode: 'system.portal', menuName: '门户内容', parentId: 2, path: '/portal/content', sort: 4, status: 1, createTime: dt(-60 * 24 * 50), updateTime: dt(-60 * 24 * 20) },
  { id: 3, menuCode: 'audit', menuName: '审计日志', parentId: 0, path: '/audit', sort: 3, status: 1, createTime: dt(-60 * 24 * 80), updateTime: dt(-60 * 24 * 20) },
  { id: 4, menuCode: 'file', menuName: '文件管理', parentId: 0, path: '/file', sort: 4, status: 0, createTime: dt(-60 * 24 * 40), updateTime: dt(-60 * 24 * 10) },
]

/** 部门（扁平结构，闭包表在真实后端维护；前端按 parentId 组装树） */
export const mockDepts: DeptView[] = [
  { id: 1, deptCode: 'hq', deptName: 'YunaNexus 总部', parentId: 0, sort: 1, status: 1, createTime: dt(-60 * 24 * 120), updateTime: dt(-60 * 24 * 40) },
  { id: 11, deptCode: 'hq.tech', deptName: '技术中心', parentId: 1, sort: 1, status: 1, createTime: dt(-60 * 24 * 110), updateTime: dt(-60 * 24 * 35) },
  { id: 12, deptCode: 'hq.ops', deptName: '运维部', parentId: 1, sort: 2, status: 1, createTime: dt(-60 * 24 * 110), updateTime: dt(-60 * 24 * 35) },
  { id: 111, deptCode: 'hq.tech.dev', deptName: '研发组', parentId: 11, sort: 1, status: 1, createTime: dt(-60 * 24 * 100), updateTime: dt(-60 * 24 * 30) },
  { id: 112, deptCode: 'hq.tech.qa', deptName: '测试组', parentId: 11, sort: 2, status: 1, createTime: dt(-60 * 24 * 100), updateTime: dt(-60 * 24 * 30) },
  { id: 121, deptCode: 'hq.ops.sre', deptName: 'SRE 组', parentId: 12, sort: 1, status: 0, createTime: dt(-60 * 24 * 90), updateTime: dt(-60 * 24 * 20) },
]

/** 角色 → 权限绑定（覆盖语义，与后端一致） */
export const mockRolePermissions: Record<number, number[]> = {
  1: [101, 102, 103, 104, 105, 106],
  2: [101, 104, 105],
  3: [104],
  4: [105],
  5: [],
}

/** 角色 → 菜单绑定 */
export const mockRoleMenus: Record<number, number[]> = {
  1: [1, 2, 21, 22, 23, 24, 3, 4],
  2: [1, 2, 21, 23, 3],
  3: [1, 3],
  4: [1],
  5: [],
}

/** 角色 → 数据范围部门绑定（仅 dataScope=自定义 时生效） */
export const mockRoleDepts: Record<number, number[]> = {
  1: [1, 11, 12],
  2: [11, 111, 112],
  3: [1],
  4: [],
  5: [],
}

export const mockNotices: NoticeRecordView[] = [
  {
    id: 5,
    noticeId: 900005,
    templateCode: 'MONTHLY_SUMMARY',
    channel: 1,
    channelLabel: '站内信',
    receiver: '10001',
    title: '【月度运营报告】10 月平台运行与安全审计总结（超长通知测试）',
    content: [
      '你好 alice，以下是本月的平台运行与安全审计总结，请查阅。',
      '',
      '一、总体运行情况',
      '本月平台累计处理请求 1,284,930 次，日均 41,449 次，较上月增长 12.6%。核心服务平均响应时间 42ms，P99 响应时间 186ms，整体可用性 99.982%。网关层共拦截异常请求 3,214 次，其中触发限流 812 次。',
      '',
      '二、认证与账号安全',
      '本月新增注册用户 1,286 人，注销 74 人。检测到异地登录尝试 39 次，已全部触发二次验证；拦截暴力破解 17 起，涉及账号 23 个，均已自动锁定并推送安全提醒。建议对连续 5 次以上登录失败的高风险账号开启强制改密策略。',
      '',
      '三、文件与存储',
      '累计上传文件 8,642 个，总容量 12.7GB，其中图片类占比 48%，文档类占比 37%。发现并清理过期临时文件 1,204 个，回收空间 3.2GB。存在 3 个大于 100MB 的大文件，建议评估是否归档至冷存储。',
      '',
      '四、审计与合规',
      '审计日志共记录操作 26,510 条，其中敏感操作 412 条（含角色变更 86 条、权限调整 154 条、数据导出 172 条）。所有敏感操作均已留存 traceId，可完整追溯。本月未发现越权访问行为。',
      '',
      '五、下月计划与建议',
      '1. 推进登录风控规则升级，引入设备指纹维度；',
      '2. 优化文件存储策略，对冷数据启用生命周期管理；',
      '3. 补充角色最小权限模板，降低误授权风险；',
      '4. 完善通知渠道，增加邮件与短信的降级重试。',
      '',
      '如需查看完整报告明细，请前往「审计日志」与「文件管理」模块，或联系平台管理员获取导出文件。感谢你对平台安全与稳定的持续关注。',
      '—— YunaNexus 平台运维组',
    ].join('\n'),
    params: null,
    status: 1,
    retryCount: 0,
    sendTime: dt(-8),
    errorMsg: null,
    createTime: dt(-8),
  },
  {
    id: 1,
    noticeId: 900001,
    templateCode: 'E2E_MEETING_REMIND',
    channel: 1,
    channelLabel: '站内信',
    receiver: '10001',
    title: '产品周会提醒',
    content: '你好 alice，产品周会将于 14:00 在 3 号会议室开始，请准时参加。',
    params: '{"name":"alice","meeting":"产品周会","time":"14:00"}',
    status: 1,
    retryCount: 0,
    sendTime: dt(-20),
    errorMsg: null,
    createTime: dt(-20),
  },
  {
    id: 2,
    noticeId: 900002,
    templateCode: 'SYSTEM_MAINTENANCE',
    channel: 1,
    channelLabel: '站内信',
    receiver: '10001',
    title: '系统维护通知',
    content: '平台将于本周六 02:00 - 04:00 进行例行维护，期间部分服务不可用。',
    params: null,
    status: 3,
    retryCount: 0,
    sendTime: dt(-60 * 24),
    errorMsg: null,
    createTime: dt(-60 * 24),
  },
  {
    id: 3,
    noticeId: 900003,
    templateCode: 'SECURITY_ALERT',
    channel: 1,
    channelLabel: '站内信',
    receiver: '10001',
    title: '安全提醒：检测到新设备登录',
    content: '你的账号于 10.12.3.41 登录，如非本人操作请及时修改密码。',
    params: null,
    status: 3,
    retryCount: 0,
    sendTime: dt(-60 * 24 * 2),
    errorMsg: null,
    createTime: dt(-60 * 24 * 2),
  },
  {
    id: 4,
    noticeId: 900004,
    templateCode: 'E2E_MEETING_REMIND',
    channel: 1,
    channelLabel: '站内信',
    receiver: '10001',
    title: '迭代评审提醒',
    content: '你好 alice，迭代评审将于 16:30 开始，请提前准备演示材料。',
    params: null,
    status: 1,
    retryCount: 0,
    sendTime: dt(-60 * 5),
    errorMsg: null,
    createTime: dt(-60 * 5),
  },
]

export const mockNoticeTemplates: NoticeTemplateView[] = [
  {
    id: 1,
    templateCode: 'E2E_MEETING_REMIND',
    templateName: '会议提醒',
    channel: 1,
    channelLabel: '站内信',
    title: '${meeting}提醒',
    content: '你好 ${name}，${meeting}将于 ${time} 开始，请准时参加。',
    status: 1,
    remark: '通用会议提醒模板',
    createTime: dt(-60 * 24 * 30),
    updateTime: dt(-60 * 24 * 5),
  },
  {
    id: 2,
    templateCode: 'SECURITY_ALERT',
    templateName: '安全提醒',
    channel: 1,
    channelLabel: '站内信',
    title: '安全提醒：检测到新设备登录',
    content: '你好 ${name}，你的账号于 ${ip} 登录，如非本人操作请及时修改密码。',
    status: 1,
    remark: '异地 / 新设备登录风控触发',
    createTime: dt(-60 * 24 * 40),
    updateTime: dt(-60 * 24 * 10),
  },
  {
    id: 3,
    templateCode: 'SYSTEM_MAINTENANCE',
    templateName: '系统维护通知',
    channel: 1,
    channelLabel: '站内信',
    title: '系统维护通知',
    content: '平台将于 ${window} 进行例行维护，期间部分服务不可用。',
    status: 1,
    remark: '计划内维护公告',
    createTime: dt(-60 * 24 * 60),
    updateTime: dt(-60 * 24 * 20),
  },
  {
    id: 4,
    templateCode: 'MONTHLY_SUMMARY',
    templateName: '月度运营报告',
    channel: 1,
    channelLabel: '站内信',
    title: '【月度运营报告】${month} 平台运行与安全审计总结',
    content: '你好 ${name}，以下是 ${month} 的平台运行与安全审计总结，请查阅。',
    status: 1,
    remark: '每月 1 日定时发送',
    createTime: dt(-60 * 24 * 90),
    updateTime: dt(-60 * 24 * 30),
  },
  {
    id: 5,
    templateCode: 'APPEAL_RESULT',
    templateName: '申诉结果通知',
    channel: 2,
    channelLabel: '邮件',
    title: '你的账号解锁申诉已处理',
    content: '你好 ${name}，你提交的解锁申诉已${result}，${remark}',
    status: 0,
    remark: '停用中：待接入邮件通道后启用',
    createTime: dt(-60 * 24 * 15),
    updateTime: dt(-60 * 24 * 3),
  },
]

export const mockFiles: FileView[] = [
  { fileId: 500001, fileName: '需求说明书_v2.docx', ext: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 254_976, sha256: 'a3f1…9c2b', createBy: 10001, deptId: 1, createTime: dt(-60 * 6) },
  { fileId: 500002, fileName: '架构设计图.png', ext: 'png', contentType: 'image/png', size: 1_048_576, sha256: 'b7d2…4e8a', createBy: 10001, deptId: 1, createTime: dt(-60 * 30) },
  { fileId: 500003, fileName: '发布清单.xlsx', ext: 'xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 18_432, sha256: 'c1e9…7f30', createBy: 10001, deptId: 1, createTime: dt(-60 * 24 * 2) },
  { fileId: 500004, fileName: '服务拓扑.svg', ext: 'svg', contentType: 'image/svg+xml', size: 32_768, sha256: 'd4a8…2b61', createBy: 10001, deptId: 2, createTime: dt(-60 * 24 * 4) },
  { fileId: 500005, fileName: '压测报告.pdf', ext: 'pdf', contentType: 'application/pdf', size: 786_432, sha256: 'e6c3…8a05', createBy: 10001, deptId: 2, createTime: dt(-60 * 24 * 6) },
]

const services = ['yunanexus-auth', 'yunanexus-permission', 'yunanexus-file', 'yunanexus-gateway']
const actions = ['login', 'logout', 'user.disable', 'role.update', 'file.upload', 'log.query']

export const mockAuditLogs: AuditLogView[] = Array.from({ length: 26 }, (_, i) => {
  const userId = 10001 + (i % 6)
  const action = actions[i % actions.length]
  const failed = i % 7 === 3
  return {
    id: 70000 + i,
    userId,
    shardIndex: userId % 16,
    username: mockUsers[i % mockUsers.length].username,
    service: services[i % services.length],
    module: action.split('.')[0],
    action,
    method: i % 3 === 0 ? 'POST' : 'GET',
    uri: `/api/v1/${action.replace('.', '/')}`,
    params: i % 3 === 0 ? JSON.stringify({ target: `${userId}` }) : null,
    result: null,
    status: failed ? 0 : 1,
    errorMsg: failed ? '上下游超时' : null,
    ip: `10.12.${3 + (i % 5)}.${10 + (i % 200)}`,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    durationMs: 8 + ((i * 7) % 240),
    traceId: `768b3a3f2f184c00ae3ac0836b3527${String(i).padStart(2, '0')}`,
    createTime: dt(-8 * i),
  }
})
