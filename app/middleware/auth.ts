import { useUser } from "~/composables/useUser";
import { useUserStore } from "~/stores/user";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { storage, TokenKey } from "~/utils/storage";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const token = storage.get(TokenKey);
  const userStore = useUserStore();
  const { validToken } = useAuthApi();

  try {
    if (!token) {
      userStore.logout();
      return navigateTo("/login");
    }
    const { validToken } = useAuthApi();
    const res = await validToken(token);
    if (res.code !== 200) {
      userStore.logout();
      return navigateTo("/login");
    }
  } catch (e) {
    userStore.logout();
    return navigateTo("/login");
  }
});
