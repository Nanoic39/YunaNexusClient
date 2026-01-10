import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";
import type { UserProfile, UserUpdateDTO } from "~/types/profile";

export const useProfileApi = () => {
  const uploadAvatar = async (file: Blob) => {
    // 1. 上传文件
    const formData = new FormData();
    // 给 Blob 指定文件名，否则后端接收到的是 "blob"
    formData.append("file", file, "avatar.png");
    formData.append("category", "1"); // 1=公开资源，允许头像被他人访问

    const uploadRes = await useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: {
        uuid: string;
        originName: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        storageType: number;
        category: number;
      };
    }>(`${API_PREFIX.FILE}/file/upload`, {
      method: "POST",
      body: formData,
      timeout: 20000, // 上传文件可能较慢
    });

    if (uploadRes.code !== 200 || !uploadRes.data?.uuid) {
      return uploadRes;
    }

    // 2. 更新用户信息
    const updateRes = await updateUserProfile({
      avatar: uploadRes.data.uuid,
    });

    // 构造返回结果，保持兼容性
    if (updateRes.code === 200) {
      return {
        code: 200,
        msg: "头像上传成功",
        tips: "",
        data: {
          avatarUrl: `/api/file/file/download/${uploadRes.data.uuid}?inline=true`,
        },
      };
    }

    return updateRes;
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
      params: { _t: Date.now() }, // 防止缓存
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
