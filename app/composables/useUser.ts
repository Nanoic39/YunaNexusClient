import { MOCK_USER_PROFILE } from '~/utils/mockData'

export const useUser = () => {
  const user = useState<any>('user', () => MOCK_USER_PROFILE)

  const isLoggedIn = computed(() => !!user.value?.isLoggedIn)

  const login = (userData: any) => {
    user.value = { ...userData, isLoggedIn: true }
  }

  const logout = () => {
    // 可以完全清除，或者只是标记为未登录
    user.value = { isLoggedIn: false }
  }

  return {
    user,
    isLoggedIn,
    login,
    logout
  }
}
