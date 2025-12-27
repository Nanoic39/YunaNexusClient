import type { UserLoginVO } from "~/types/auth";

export const useAuthApi = () => {
  const login = async (data: any) => {
    return useFetch<{ code: number; msg: string; data: UserLoginVO }>(
      "/api/auth/login",
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const loginByCode = async (data: any) => {
    return useFetch<{ code: number; msg: string; data: UserLoginVO }>(
      "/api/auth/login/code",
      {
        method: "POST",
        body: data,
        timeout: 5000,
        retry: 0,
      }
    );
  };

  const sendCode = async (email: string) => {
    return useFetch<{ code: number; msg: string }>("/api/auth/send-code", {
      method: "POST",
      params: { email },
      timeout: 5000,
      retry: 0,
    });
  };

  const checkEmail = async (email: string) => {
    return useFetch<{ code: number; msg: string; data: boolean }>("/api/auth/check-email", {
      method: "GET",
      params: { email },
      timeout: 5000,
      retry: 0,
    });
  };

  return {
    login,
    loginByCode,
    sendCode,
    checkEmail,
  };
};
