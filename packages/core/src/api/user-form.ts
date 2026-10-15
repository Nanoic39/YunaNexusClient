import type { UserProfileUpdatePayload, UserProfileView, UserTag } from '../types/user'

export interface ProfileDraft {
  nickname: string
  avatar: string
  email: string
}

export function safeAvatarUrl(
  value: string | null | undefined,
  origin: string,
): string | undefined {
  if (!value || /[\\\r\n]/.test(value)) return undefined
  try {
    const url = new URL(value, origin)
    if (url.username || url.password || (url.protocol !== 'https:' && url.origin !== origin))
      return undefined
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** 只提交变更字段；手机号与登录凭证不属于本人资料表单。 */
export function profilePatch(
  current: UserProfileView,
  draft: ProfileDraft,
  origin: string,
): UserProfileUpdatePayload {
  const next = {
    nickname: draft.nickname.trim(),
    avatar: draft.avatar.trim(),
    email: draft.email.trim(),
  }
  if (next.nickname.length > 64) throw new Error('昵称最多 64 个字符')
  if (
    next.avatar.length > 512 ||
    (next.avatar && !/^file:[1-9][0-9]*$/.test(next.avatar) && !safeAvatarUrl(next.avatar, origin))
  )
    throw new Error('头像请使用 HTTPS 地址或本站图片路径，最多 512 个字符')
  if (next.email.length > 128 || (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)))
    throw new Error('请输入有效的联系邮箱，最多 128 个字符')
  const patch: UserProfileUpdatePayload = {}
  for (const key of ['nickname', 'avatar', 'email'] as const) {
    if (next[key] !== (current[key] ?? '')) patch[key] = next[key]
  }
  return patch
}

export function normalizeTags(tags: UserTag[]): UserTag[] {
  if (tags.length > 20) throw new Error('最多保存 20 个标签')
  const codes = new Set<string>()
  return tags.map((tag) => {
    const item = {
      tagCode: tag.tagCode.trim(),
      tagName: tag.tagName.trim(),
      color: tag.color || null,
    }
    if (!item.tagCode || item.tagCode.length > 32 || !item.tagName || item.tagName.length > 32)
      throw new Error('标签名称和标识须为 1~32 个字符')
    if (codes.has(item.tagCode)) throw new Error('标签标识不能重复')
    if (item.color && !/^#[0-9a-fA-F]{6}$/.test(item.color))
      throw new Error('标签颜色须为六位十六进制颜色')
    codes.add(item.tagCode)
    return item
  })
}
