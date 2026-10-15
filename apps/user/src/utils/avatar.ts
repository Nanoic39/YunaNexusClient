import { ref } from 'vue'
import { workspaceApi, safeAvatarUrl } from '@yuna/core'
export const currentAvatar = ref<string>()
let generation = 0
export function clearAvatar() {
  generation++
  if (currentAvatar.value?.startsWith('blob:')) URL.revokeObjectURL(currentAvatar.value)
  currentAvatar.value = undefined
}
export async function loadAvatar(value: string | null | undefined) {
  clearAvatar()
  const version = generation
  if (!value) return
  const match = /^file:([1-9][0-9]*)$/.exec(value)
  if (!match) {
    currentAvatar.value = safeAvatarUrl(value, location.origin)
    return
  }
  try {
    const blob = await workspaceApi.download(Number(match[1]))
    if (version !== generation) return
    currentAvatar.value = URL.createObjectURL(new Blob([blob], { type: 'image/jpeg' }))
  } catch {
    /* 头像加载失败时保持姓名缩写；不影响资料页其余功能。 */
  }
}
