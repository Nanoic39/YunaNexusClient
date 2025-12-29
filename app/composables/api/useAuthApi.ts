import type { UserLoginVO } from "~/types/auth";
import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";

export const useAuthApi = () => {
  const login = async (data: any) => {
    return useHttp<{ code: number; msg: string; data: UserLoginVO }>(
      `${API_PREFIX.USER}/auth/login`,
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const loginByCode = async (data: any) => {
    return useHttp<{ code: number; msg: string; data: UserLoginVO }>(
      `${API_PREFIX.USER}/auth/login/code`,
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const register = async (data: any) => {
    return useHttp<{ code: number; msg: string; data: number }>(
      `${API_PREFIX.USER}/auth/register`,
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const sendCode = async (email: string) => {
    return useHttp<{ code: number; msg: string }>(
      `${API_PREFIX.USER}/auth/send-code`,
      {
        method: "POST",
        params: { email },
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const checkEmail = async (email: string) => {
    return useHttp<{ code: number; msg: string; data: boolean }>(
      `${API_PREFIX.USER}/auth/check-email`,
      {
        method: "GET",
        params: { email },
        timeout: 5000,
        retry: 0,
      }
    );
  };

  return {
    login,
    loginByCode,
    register,
    sendCode,
    checkEmail,
  };
};
