import { ref } from 'vue'
import { workspaceApi, safeAvatarUrl, session } from '@yuna/core'
export const currentAvatar = ref<string>()
let generation = 0,
  key = '',
  pending: Promise<void> | undefined,
  controller: AbortController | undefined
export function clearAvatar() {
  generation++
  controller?.abort()
  controller = undefined
  pending = undefined
  key = ''
  if (currentAvatar.value?.startsWith('blob:')) URL.revokeObjectURL(currentAvatar.value)
  currentAvatar.value = undefined
}
export function loadAvatar(value: string | null | undefined): Promise<void> {
  const account = session.state.externalId,
    nextKey = `${account ?? ''}\0${value ?? ''}`
  if (nextKey === key) {
    if (pending) return pending
    if (currentAvatar.value) return Promise.resolve()
  }
  clearAvatar()
  key = nextKey
  const version = generation
  if (!value) return Promise.resolve()
  const match = /^file:([1-9][0-9]*)$/.exec(value)
  if (!match) {
    currentAvatar.value = safeAvatarUrl(value, location.origin)
    return Promise.resolve()
  }
  const id = Number(match[1])
  if (!Number.isSafeInteger(id)) {
    key = ''
    return Promise.resolve()
  }
  const active = new AbortController()
  controller = active
  pending = (async () => {
    try {
      const blob = await workspaceApi.download(id, active.signal)
      if (version !== generation || account !== session.state.externalId) return
      currentAvatar.value = URL.createObjectURL(new Blob([blob], { type: 'image/jpeg' }))
    } catch {
      if (version === generation) key = ''
    } finally {
      if (version === generation) {
        pending = undefined
        controller = undefined
      }
    }
  })()
  return pending
}
