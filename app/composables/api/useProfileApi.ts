import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";
import type { UserProfile, UserUpdateDTO } from "~/types/profile";

export const useProfileApi = () => {
  const uploadAvatar = async (file: Blob) => {
    const url = URL.createObjectURL(file);
    return Promise.resolve({
      code: 200,
      msg: "OK",
      tips: "",
      data: { avatarUrl: url },
    });
  };

  /**
   * 获取用户个人信息
   * @param token
   * @returns
   */
  const getUserProfile = async () => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: UserProfile;
    }>(`${API_PREFIX.USER}/user/profile`, {
      method: "GET",
      timeout: 5000,
      retry: 0,
    });
  };

  /**
   * 更新用户个人信息
   * @param token
   * @param userUpdateDTO
   * @returns
   */
  const updateUserProfile = async (userUpdateDTO: UserUpdateDTO) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: null;
    }>(`${API_PREFIX.USER}/user/update`, {
      method: "POST",
      timeout: 5000,
      retry: 0,
      body: userUpdateDTO,
    });
  };

  /**
   * 修改密码
   * @param data
   * @returns
   */
  const changePassword = async (data: {
    oldPassword?: string;
    newPassword: string;
  }) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: null;
    }>(`${API_PREFIX.USER}/user/change-password`, {
      method: "POST",
      timeout: 5000,
      retry: 0,
      body: data,
    });
  };

  /**
   * 修改邮箱
   * @param data
   * @returns
   */
  const changeEmail = async (data: {
    newEmail: string;
    newEmailCode: string;
    oldEmailCode?: string;
  }) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: null;
    }>(`${API_PREFIX.USER}/user/change-email`, {
      method: "POST",
      timeout: 5000,
      retry: 0,
      body: data,
    });
  };

  return {
    uploadAvatar,
    getUserProfile,
    updateUserProfile,
    changePassword,
    changeEmail,
  };
};
