import type { UserLoginVO } from "~/types/auth";

export const useAuthApi = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  const login = async (data: any) => {
    return useFetch<{ code: number; msg: string; data: UserLoginVO }>(
      "/auth/login",
      {
        baseURL: apiBase,
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const loginByCode = async (data: any) => {
    return useFetch<{ code: number; msg: string; data: UserLoginVO }>(
      "/auth/login/code",
      {
        baseURL: apiBase,
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const register = async (data: any) => {
    return useFetch<{ code: number; msg: string; data: number }>(
      "/auth/register",
      {
        baseURL: apiBase,
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const sendCode = async (email: string) => {
    return useFetch<{ code: number; msg: string }>("/auth/send-code", {
      baseURL: apiBase,
      method: "POST",
      params: { email },
      timeout: 5000,
      retry: 0,
    });
  };

  const checkEmail = async (email: string) => {
    return useFetch<{ code: number; msg: string; data: boolean }>(
      "/auth/check-email",
      {
        baseURL: apiBase,
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
