import { defineStore } from "pinia";
import { RefreshTokenKey, storage, TokenKey, UserKey } from "~/utils/storage";

export const useUserStore = defineStore("user", () => {
  const user = ref<any>({
    isLoggedIn: false,
  });

  const isLoggedIn = computed(() => !!user.value.isLoggedIn);

  /**
   * 初始化用户状态
   * 从本地存储恢复用户会话，验证 Token 有效性
   */
  function init() {
    try {
      const token = storage.get(TokenKey);
      const refreshToken = storage.get(RefreshTokenKey);
      const userInfo = storage.get(UserKey);

      console.log("[用户状态] 正在初始化...", {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserInfo: !!userInfo,
      });

      // 验证 Token 有效性
      if (token && userInfo && isValidToken(token)) {
        user.value = { ...userInfo, isLoggedIn: true };
        console.log("[用户状态] 状态恢复成功");
      } else {
        console.log("[用户状态] 本地存储中未找到有效会话或 Token 无效");
        // 只有当存在部分数据时才执行清理，避免无限循环（虽然 logout 不会触发 init）
        if (token || userInfo) {
          logout();
        }
      }
    } catch (e) {
      console.error("[用户状态] 状态恢复失败:", e);
      logout();
    }
  }

  /**
   * 验证 Token 是否有效
   * @param token 待验证的 Token
   * @returns 是否有效
   */
  function isValidToken(token: string): boolean {
    // 仅检查非空字符串
    return typeof token === "string" && token.length > 0;
  }

  /**
   * 登录账号
   * @param userData 登录数据，包含 Token、RefreshToken 和用户信息
   */
  function login(userData: any) {
    const { token, refreshToken, ...userInfo } = userData;
    user.value = { ...userInfo, isLoggedIn: true };

    if (token) {
      storage.set(TokenKey, token);
    }
    if (refreshToken) {
      storage.set(RefreshTokenKey, refreshToken);
    }
    storage.set(UserKey, userInfo);
  }

  /**
   * 登出账号
   */
  function logout() {
    user.value = { isLoggedIn: false };
    storage.remove(TokenKey);
    storage.remove(RefreshTokenKey);
    storage.remove(UserKey);

    const tokenCookie = useCookie("token");
    tokenCookie.value = null;
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
    init,
  };
});
