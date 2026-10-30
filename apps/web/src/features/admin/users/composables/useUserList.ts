import { onMounted, ref } from 'vue'
import { authAdminApi, type AdminUserView, toErrorMessage } from '@yuna/core'
import { useDialog } from 'naive-ui'

export function useUserList() {
  const dialog = useDialog()
  const acting = ref(false)
  const adminUserApi = {
    list: authAdminApi.listUsers,
    disable: authAdminApi.disableUser,
    unlock: authAdminApi.unlockUser,
  }

  const rows = ref<AdminUserView[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const keyword = ref('')
  const status = ref<number | undefined>()
  const loading = ref(false)
  const error = ref('')

  let requestId = 0

  async function load(): Promise<void> {
    const id = ++requestId
    loading.value = true
    error.value = ''
    try {
      const result = await adminUserApi.list({
        keyword: keyword.value.trim() || undefined,
        status: status.value,
        page: page.value,
        size: pageSize.value,
      })
      if (id !== requestId) return
      rows.value = result.records ?? []
      total.value = result.total ?? 0
    } catch (e) {
      if (id !== requestId) return
      rows.value = []
      total.value = 0
      error.value = e instanceof Error ? e.message : '加载失败'
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  function search(): void {
    page.value = 1
    void load()
  }

  function changeStatus(value: string): void {
    status.value = value === '' ? undefined : Number(value)
    search()
  }

  function changePage(next: number): void {
    page.value = next
    void load()
  }

  function changeSize(next: number): void {
    pageSize.value = next
    page.value = 1
    void load()
  }

  function statusText(status: number, lockedUntil?: string | null): string {
    if (status !== 1) return '已禁用'
    return lockedUntil && new Date(lockedUntil).getTime() > Date.now() ? '已锁定' : '正常'
  }
  function statusClass(status: number, lockedUntil?: string | null): string {
    const text = statusText(status, lockedUntil)
    return text === '正常' ? 'ok' : text === '已锁定' ? 'warn' : 'off'
  }

  async function runAction(row: AdminUserView, action: 'disable' | 'unlock'): Promise<void> {
    if (acting.value) return
    acting.value = true
    try {
      await adminUserApi[action](row.userId)
      await load()
    } catch (e) {
      error.value = toErrorMessage(e)
    } finally {
      acting.value = false
    }
  }
  function disable(row: AdminUserView): void {
    dialog.warning({
      title: '禁用账户',
      content: `确认禁用 ${row.username}？该账户将无法继续访问平台。`,
      positiveText: '确认禁用',
      negativeText: '取消',
      onPositiveClick: () => runAction(row, 'disable'),
    })
  }
  function unlock(row: AdminUserView): void {
    void runAction(row, 'unlock')
  }

  onMounted(load)
  return {
    load,
    rows,
    total,
    page,
    pageSize,
    keyword,
    status,
    loading,
    error,
    acting,
    search,
    changePage,
    changeSize,
    changeStatus,
    statusText,
    statusClass,
    disable,
    unlock,
  }
}
