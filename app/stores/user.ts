import { defineStore } from "pinia";
import { RefreshTokenKey, storage, TokenKey, UserKey } from "~/utils/storage";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";
import { logger } from "~/utils/logger";
import { API_PREFIX } from "~/composables/api/constants";
import { useHttp } from "~/composables/useHttp";
import DefaultAvatar from "~/assets/images/avatar/image.png";

export const useUserStore = defineStore("user", () => {
  const user = ref<any>({
    isLoggedIn: false,
    permissions: [],
  });

  const avatarUrl = ref<string>(DefaultAvatar);

  const isLoggedIn = computed(() => !!user.value.isLoggedIn);
  const permissions = computed(() => user.value.permissions || []);

  /**
   * 异步加载并缓存头像
   */
  async function fetchAvatar() {
    const avatarId = user.value.userInfo?.avatar;
    if (!avatarId) {
      avatarUrl.value = DefaultAvatar;
      return;
    }

    if (avatarId.startsWith("http") || avatarId.startsWith("data:")) {
      avatarUrl.value = avatarId;
      return;
    }

    // 提取 UUID
    let uuid = avatarId;
    if (avatarId.startsWith("/file/download/")) {
      const parts = avatarId.split("/");
      const uuidPart = parts[parts.length - 1];
      uuid = uuidPart.split("?")[0];
    }

    try {
      // 释放旧的 URL 对象
      if (avatarUrl.value && avatarUrl.value.startsWith("blob:")) {
        URL.revokeObjectURL(avatarUrl.value);
      }

      const blob = await useHttp<Blob>(`${API_PREFIX.FILE}/file/download/${uuid}?inline=true`, {
        method: 'GET',
        responseType: 'blob'
      });
      
      avatarUrl.value = URL.createObjectURL(blob);
    } catch (e) {
      console.error("加载头像失败:", e);
      avatarUrl.value = DefaultAvatar;
    }
  }

  /**
   * 获取用户权限
   */
  async function fetchPermissions() {
    try {
      const api = useUserManagementApi();
      const res = (await api.fetchCurrentUserPermissions()) as any;
      if (res.code === 200 && res.data) {
        user.value.permissions = res.data.map((p: any) => p.permCode);
        //TODO: 待删除提示文本 [用户状态] 权限加载成功
        logger.info("[用户状态] 权限加载成功", user.value.permissions);
      } else {
        user.value.permissions = [];
      }
    } catch (e) {
      logger.error("[用户状态] 权限加载失败", e);
      user.value.permissions = [];
    }
  }

  /**
   * 初始化用户状态
   * 从本地存储恢复用户会话，验证 Token 有效性
   */
  async function init() {
    try {
      const token = storage.get(TokenKey);
      const refreshToken = storage.get(RefreshTokenKey);
      const userInfo = storage.get(UserKey);

      logger.info("[用户状态] 正在初始化...", {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserInfo: !!userInfo,
      });

      const hasLocalSession =
        !!userInfo &&
        (isEmptyToken(token as any) || isEmptyToken(refreshToken as any));

      if (hasLocalSession) {
        const { refreshToken: apiRefreshToken, validToken: apiValidToken } =
          useAuthApi();
        // 先验证 Token 是否有效，失败则尝试刷新
        const validRes = await apiValidToken(token as string);
        if (validRes.code !== 200) {
          try {
            const refreshRes = await apiRefreshToken(refreshToken as string);
            if (refreshRes && refreshRes.code === 200 && refreshRes.data) {
              logger.info("[用户状态] 成功", "服务器校验通过，状态恢复成功");
              await login(refreshRes.data);
            } else {
              logger.error("[用户状态] 所有token刷新失败，执行登出", null);
              logout();
              return;
            }
          } catch (e) {
            logger.error("[用户状态] 刷新异常，执行登出", e);
            logout();
            return;
          }
        } else {
          user.value = { ...(userInfo as any), isLoggedIn: true, permissions: [] };
          logger.info("[用户状态] 成功", "校验成功，状态已恢复");
          await fetchAvatar(); // 恢复状态后加载头像
          await fetchPermissions(); // 恢复状态后加载权限
        }
      } else {
        // hasLocalSession 校验失败
        logger.error("[用户状态] 失败", "本地存储无有效会话，状态恢复失败");
        logout();
      }
    } catch (e) {
      logger.error("[用户状态] 状态恢复失败:", e);
      logout();
    }
  }

  /**
   * 验证 Token 是否存在
   * @param token 待验证的 Token
   * @returns 是否存在
   */
  function isEmptyToken(token: string): boolean {
    return typeof token === "string" && token.length > 0;
  }

  /**
   * 登录账号
   * @param userData 登录数据，包含 Token、RefreshToken 和用户信息
   */
  async function login(userData: any) {
    const { token, refreshToken, ...userInfo } = userData;
    user.value = { ...userInfo, isLoggedIn: true, permissions: [] };

    if (token) {
      storage.set(TokenKey, token);
    }
    if (refreshToken) {
      storage.set(RefreshTokenKey, refreshToken);
    }
    storage.set(UserKey, userInfo);
    await fetchAvatar(); // 登录成功后加载头像
    await fetchPermissions(); // 登录成功后加载权限
  }

  /**
   * 登出账号
   */
  function logout() {
    // 清理头像缓存
    if (avatarUrl.value && avatarUrl.value.startsWith("blob:")) {
      URL.revokeObjectURL(avatarUrl.value);
    }
    avatarUrl.value = DefaultAvatar;

    user.value = { isLoggedIn: false, permissions: [] };
    storage.remove(TokenKey);
    storage.remove(RefreshTokenKey);
    storage.remove(UserKey);

    const tokenCookie = useCookie("token");
    tokenCookie.value = null;
  }

  return {
    user,
    isLoggedIn,
    permissions,
    avatarUrl,
    login,
    logout,
    init,
    fetchAvatar,
    fetchPermissions,
  };
});
