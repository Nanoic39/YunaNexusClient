import type { UserLoginVO } from "~/types/auth";
import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";

/**
 * 认证 API 模块
 * 提供用户登录、注册、验证码验证、Token 刷新等功能
 * @returns 认证 API 实例
 */
export const useAuthApi = () => {
  /**
   * 密码登录
   * @param data 登录数据
   * @returns 登录结果
   */
  const login = async (data: any) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: UserLoginVO;
    }>(`${API_PREFIX.USER}/auth/login`, {
      method: "POST",
      body: data,
      timeout: 5000,
      retry: 0,
    });
  };

  /**
   * 邮箱验证码登录
   * @param data 登录数据
   * @returns 登录结果
   */
  const loginByCode = async (data: any) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: UserLoginVO;
    }>(`${API_PREFIX.USER}/auth/login/code`, {
      method: "POST",
      body: data,
      timeout: 5000,
      retry: 0,
    });
  };

  /**
   * 注册账号
   * @param data 注册数据
   * @returns 注册结果
   */
  const register = async (data: any) => {
    return useHttp<{ code: number; msg: string; tips: string; data: number }>(
      `${API_PREFIX.USER}/auth/register`,
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  /**
   * 发送验证码
   * @param email 邮箱地址
   * @returns 验证码发送结果
   */
  const sendCode = async (email: string) => {
    return useHttp<{ code: number; msg: string; tips: string }>(
      `${API_PREFIX.USER}/auth/send-code`,
      {
        method: "POST",
        params: { email },
        timeout: 5000,
        retry: 0,
      }
    );
  };

  /**
   * 检查邮箱是否已注册
   * @param email 邮箱地址
   * @returns 是否已注册
   */
  const checkEmail = async (email: string) => {
    return useHttp<{ code: number; msg: string; tips: string; data: boolean }>(
      `${API_PREFIX.USER}/auth/check-email`,
      {
        method: "GET",
        params: { email },
        timeout: 5000,
        retry: 0,
      }
    );
  };

  /**
   * 刷新 Token
   * @param refreshToken 刷新 Token
   * @returns 新的 Token 信息
   */
  const refreshToken = async (refreshToken: string) => {
    return useHttp<{
      code: number;
      msg: string;
      tips: string;
      data: UserLoginVO;
    }>(`${API_PREFIX.USER}/auth/refresh`, {
      method: "POST",
      params: { refreshToken },
      timeout: 5000,
      retry: 0,
    });
  };

  return {
    login,
    loginByCode,
    register,
    sendCode,
    checkEmail,
    refreshToken,
  };
};
