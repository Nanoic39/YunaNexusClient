import { useUserStore } from "~/stores/user";
import { storeToRefs } from "pinia";
import { API_PREFIX } from "~/composables/api/constants";
import DefaultAvatar from "~/assets/images/avatar/image.png";

export const useUser = () => {
  const userStore = useUserStore();
  const { user, isLoggedIn, avatarUrl } = storeToRefs(userStore);
  const { login, logout, init, fetchAvatar } = userStore;

  // 为了保持兼容性，getAvatarUrl 可以暂时保留，但建议直接使用 avatarUrl 响应式变量
  // 或者将其修改为直接返回 store 中的 avatarUrl
  const getAvatarUrl = (avatar: string | undefined | null) => {
    return avatarUrl.value;
  };

  /**
   * 刷新头像
   * 重新从服务器加载头像并更新缓存
   */
  const refreshAvatar = async () => {
    await fetchAvatar();
  };

  return {
    user,
    isLoggedIn,
    avatarUrl,
    login,
    logout,
    init,
    getAvatarUrl,
    refreshAvatar,
  };
};
