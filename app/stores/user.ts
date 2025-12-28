import { defineStore } from "pinia";
import { storage, TokenKey, UserKey } from "~/utils/storage";

export const useUserStore = defineStore("user", () => {
  const user = ref<any>({
    isLoggedIn: false,
  });

  const isLoggedIn = computed(() => !!user.value.isLoggedIn);

  function init() {
    try {
      const token = storage.get(TokenKey);
      const userInfo = storage.get(UserKey);

      console.log("[用户状态] 正在初始化...", {
        hasToken: !!token,
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

  function isValidToken(token: string): boolean {
    // TODO: 这里可以添加更复杂的验证逻辑，例如 JWT 过期检查
    // 目前仅检查非空
    return typeof token === "string" && token.length > 0;
  }

  function login(userData: any) {
    const { token, ...userInfo } = userData;
    user.value = { ...userInfo, isLoggedIn: true };

    if (token) {
      storage.set(TokenKey, token);
    }
    storage.set(UserKey, userInfo);
  }

  function logout() {
    user.value = { isLoggedIn: false };
    storage.remove(TokenKey);
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
