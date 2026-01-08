import { defineStore } from "pinia";
import { RefreshTokenKey, storage, TokenKey, UserKey } from "~/utils/storage";
import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "~/composables/api/constants";

export const useUserStore = defineStore("user", () => {
  const user = ref<any>({
    isLoggedIn: false,
  });

  const isLoggedIn = computed(() => !!user.value.isLoggedIn);

  /**
   * 初始化用户状态
   * 从本地存储恢复用户会话，验证 Token 有效性
   */
  async function init() {
    try {
      const token = storage.get(TokenKey);
      const refreshToken = storage.get(RefreshTokenKey);
      const userInfo = storage.get(UserKey);

      console.log("[用户状态] 正在初始化...", {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserInfo: !!userInfo,
      });

       const hasLocalSession =
         !!userInfo &&
         (isValidToken(token as any) || isValidToken(refreshToken as any));

       if (hasLocalSession) {
         // 通过后端接口校验 Token 有效性（任一有效即可）
         let serverValid = false;
         try {
           const res = await useHttp<{ code: number }>(
             `${API_PREFIX.USER}/auth/validate`,
             { method: "GET", retry: 0, timeout: 4000 }
           );
           serverValid = res.code === 200;
         } catch (e) {
           serverValid = false;
         }

         if (serverValid) {
           user.value = { ...userInfo, isLoggedIn: true };
           console.log("[用户状态] 服务器校验通过，状态恢复成功");
         } else {
           console.log("[用户状态] 服务器校验失败，执行登出");
           logout();
         }
       } else {
         console.log(
           "[用户状态] 本地存储无有效会话，Token 与 RefreshToken 均无效或缺失"
         );
         if (token || refreshToken || userInfo) {
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
