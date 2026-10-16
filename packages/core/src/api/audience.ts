import { authAdminApi } from './auth'
import { roleApi, userRoleApi } from './permission'
import type { AdminUserView } from '../types'

/**
 * 通知受众解析。
 *
 * 后端发送接口（`POST /api/v1/notice/send`）只接受具体的 `receivers: string[]`，
 * 不提供「所有人 / 按角色 / 按权限」的收件人选择字段，因此这些分类需由前端解析为
 * 具体用户集合后再展开为接收方字符串。
 *
 * 说明：后端暂未提供「角色 → 用户」或「权限 → 用户」的反查接口，故此处按
 * 「拉取全部用户 → 逐个查询用户角色」的方式在客户端组装索引；查询带并发限制，
 * 适用于管理端的低频发送场景。
 */

/** 受众选择方式 */
export type AudienceMode = 'users' | 'all' | 'roles' | 'permissions'

/** 受众选择条件 */
export interface AudienceSelector {
  mode: AudienceMode
  /** mode=roles 时生效 */
  roleIds?: number[]
  /** mode=permissions 时生效 */
  permissionIds?: number[]
}

const USER_PAGE_SIZE = 100
/** 单次最多扫描的用户页数，避免超大租户下无限翻页 */
const MAX_USER_PAGES = 50
/** 逐用户查询角色时的并发上限 */
const ROLE_LOOKUP_CONCURRENCY = 8

/** 分页拉取全部用户（管理端） */
async function listAllUsers(): Promise<AdminUserView[]> {
  const all = new Map<number, AdminUserView>()
  let expected: number | undefined
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const result = await authAdminApi.listUsers({ page, size: USER_PAGE_SIZE })
    if (
      !Number.isSafeInteger(result.total) ||
      result.total < 0 ||
      result.total > MAX_USER_PAGES * USER_PAGE_SIZE
    )
      throw new Error('用户数量超出安全解析范围，请缩小受众范围；不会发送部分名单')
    if (expected !== undefined && expected !== result.total)
      throw new Error('用户列表已变化，请刷新后重新确认受众')
    expected = result.total
    for (const user of result.records) all.set(user.userId, user)
    if (all.size === expected) return [...all.values()]
    if (result.records.length < USER_PAGE_SIZE) throw new Error('用户列表不完整，已中止受众解析')
  }
  throw new Error('受众解析超出上限，已中止，未返回部分名单')
}

/** 任一角色查询失败均中止；剩余工作不再继续排队，避免静默漏发。 */
async function buildUserRoleIndex(users: AdminUserView[]): Promise<Map<number, number[]>> {
  const index = new Map<number, number[]>()
  let cursor = 0,
    failed = false
  await Promise.all(
    Array.from({ length: Math.min(ROLE_LOOKUP_CONCURRENCY, users.length) }, async () => {
      while (cursor < users.length && !failed) {
        const user = users[cursor++]!
        try {
          index.set(user.userId, await userRoleApi.list(user.userId))
        } catch {
          failed = true
        }
      }
    }),
  )
  if (failed) throw new Error('部分用户角色查询失败，已中止受众解析，请重试')
  return index
}

/** 解析目标用户集合（mode=users 无意义，调用方应自行处理手动输入） */
async function resolveUsers(selector: AudienceSelector): Promise<AdminUserView[]> {
  if (
    selector.mode === 'users' ||
    (selector.mode === 'roles' && !selector.roleIds?.length) ||
    (selector.mode === 'permissions' && !selector.permissionIds?.length)
  )
    return []
  const users = await listAllUsers()
  if (selector.mode === 'all') return users

  const roleIndex = await buildUserRoleIndex(users)

  if (selector.mode === 'roles') {
    const wanted = new Set(selector.roleIds ?? [])
    if (!wanted.size) return []
    return users.filter((user) => (roleIndex.get(user.userId) ?? []).some((id) => wanted.has(id)))
  }

  const wantedPerms = new Set(selector.permissionIds ?? [])
  if (!wantedPerms.size) return []
  const roles = await roleApi.list()
  const rolePerms = await Promise.all(
    roles.map(async (role) => [role.id, await roleApi.listPermissions(role.id)] as const),
  )
  const targetRoleIds = new Set(
    rolePerms
      .filter(([, permissionIds]) => permissionIds.some((id) => wantedPerms.has(id)))
      .map(([roleId]) => roleId),
  )
  return users.filter((user) =>
    (roleIndex.get(user.userId) ?? []).some((id) => targetRoleIds.has(id)),
  )
}

/** 通知受众解析 */
export const audienceApi = {
  listAllUsers,
  resolveUsers,
}

/**
 * 将用户集合按通道展开为接收方字符串。
 *
 * - 站内信（channel=1）：接收方为用户 ID；
 * - 邮件（channel=2）：接收方为邮箱，缺失邮箱的用户会被跳过。
 */
export function usersToReceivers(users: AdminUserView[], channel: number): string[] {
  const seen = new Set<string>()
  const receivers: string[] = []
  for (const user of users) {
    const value = channel === 2 ? user.email?.trim() : String(user.userId)
    if (!value || seen.has(value)) continue
    seen.add(value)
    receivers.push(value)
  }
  return receivers
}
