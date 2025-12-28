import type { UserLoginVO } from "~/types/auth";
import { useHttp } from "~/composables/useHttp";

export const useAuthApi = () => {
  const login = async (data: any) => {
    return useHttp<{ code: number; msg: string; data: UserLoginVO }>(
      "/auth/login",
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
      "/auth/login/code",
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
      "/auth/register",
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const sendCode = async (email: string) => {
    return useHttp<{ code: number; msg: string }>("/auth/send-code", {
      method: "POST",
      params: { email },
      timeout: 5000,
      retry: 0,
    });
  };

  const checkEmail = async (email: string) => {
    return useHttp<{ code: number; msg: string; data: boolean }>(
      "/auth/check-email",
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
