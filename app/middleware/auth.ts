import { useUser } from "~/composables/useUser";
import { useUserStore } from "~/stores/user";
import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "~/composables/api/constants";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isLoggedIn } = useUser();
  const userStore = useUserStore();

  if (!isLoggedIn.value) {
    return navigateTo("/login");
  }

  try {
    const res = await useHttp<{ code: number }>(`${API_PREFIX.USER}/auth/validate`, { method: "GET", retry: 0, timeout: 4000 });
    if (res.code !== 200) {
      userStore.logout();
      return navigateTo("/login");
    }
  } catch (e) {
    userStore.logout();
    return navigateTo("/login");
  }
});
