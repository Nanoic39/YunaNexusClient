import { storage, TokenKey } from "~/utils/storage";

export const useHttp = <T>(url: string, options: any = {}) => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  const defaults = {
    baseURL: apiBase,
    // 自动为请求添加 Token
    onRequest({ options }: any) {
      const token = storage.get(TokenKey);
      if (token) {
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${token}`;
      }
    },
    // 处理 401 未授权
    onResponseError({ response }: any) {
      if (response.status === 401) {
        // 这里不能直接使用 useUser().logout()，因为可能会导致循环引用或上下文问题
        // 建议在组件层处理，或者使用简单的清理逻辑
        storage.remove(TokenKey);
        // 强制跳转
        window.location.href = "/login";
      }
    },
  };

  // 合并选项，options 优先级更高
  return useFetch<T>(url, { ...defaults, ...options });
};
