import { useUserStore } from "~/stores/user";
import { storeToRefs } from "pinia";

export const useUser = () => {
  const userStore = useUserStore();
  const { user, isLoggedIn } = storeToRefs(userStore);
  const { login, logout, init } = userStore;

  return {
    user,
    isLoggedIn,
    login,
    logout,
    init,
  };
};
