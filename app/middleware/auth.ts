import { useUser } from "~/composables/useUser";
import { useUserStore } from "~/stores/user";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { storage, TokenKey } from "~/utils/storage";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const token = storage.get(TokenKey);
  const userStore = useUserStore();
  const { validToken } = useAuthApi();

  if (!token) {
    userStore.logout();
    return navigateTo("/login");
  }

  try {
    const res = await validToken(token);
    if (res.code !== 200) {
      // 如果token验证失败，尝试用refreshToken刷新
      const refreshTokenValue = storage.get(RefreshTokenKey);
      if (refreshTokenValue) {
        try {
          const refreshRes = await useAuthApi().refreshToken(refreshTokenValue);
          if (refreshRes.code === 200 && refreshRes.data) {
            userStore.login(refreshRes.data); // 重新登录并保存新token
            return; // token刷新成功，继续导航
          }
        } catch (refreshError) {
          // 刷新失败，继续执行登出
        }
      }
      
      userStore.logout();
      return navigateTo("/login");
    }
  } catch (e) {
    userStore.logout();
    return navigateTo("/login");
  }
});
