import { useUser } from "~/composables/useUser";
import { useUserStore } from "~/stores/user";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { storage, TokenKey, RefreshTokenKey } from "~/utils/storage";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const token = storage.get(TokenKey);
  const userStore = useUserStore();
  const { validToken } = useAuthApi();

  if (!token) {
    const allowPaths = ["/login", "/register", "/about", "/", "/workbench", "/appeal"];
    const allowed =
      to.path === "/" ||
      allowPaths.some((p) => p !== "/" && to.path.startsWith(p));
    if (allowed) {
      return;
    }
    userStore.logout();
    return navigateTo("/login");
  }

  try {
    const res = await validToken(token);
    if (res.code !== 200) {
      const refreshTokenValue = storage.get(RefreshTokenKey);
      if (refreshTokenValue) {
        try {
          const refreshRes = await useAuthApi().refreshToken(refreshTokenValue);
          if (refreshRes.code === 200 && refreshRes.data) {
            userStore.login(refreshRes.data);
            return;
          }
        } catch (refreshError) {}
      }
      userStore.logout();
      return navigateTo("/login");
    }
  } catch (e) {
    userStore.logout();
    return navigateTo("/login");
  }
});
