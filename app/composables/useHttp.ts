import { storage, TokenKey } from "~/utils/storage";
import { logger } from "~/utils/logger";
import { message } from "~/utils/naive";

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
    // 处理响应
    onResponse({ response }: any) {
      const res = response._data;
      // 如果 code 不为 200，视为业务错误
      if (res && res.code && res.code !== 200) {
        // 记录 msg 到 logger
        logger.error('API Error', {
            url,
            code: res.code,
            msg: res.msg,
            tips: res.tips
        });
        
        // 显示 tips 给用户
        if (process.client && res.tips) {
            message.error(res.tips);
        }
      }
    },
    // 处理响应错误 (4xx, 5xx)
    onResponseError({ response }: any) {
      if (response.status === 401) {
        // 这里不能直接使用 useUser().logout()，因为可能会导致循环引用或上下文问题
        // 建议在组件层处理，或者使用简单的清理逻辑
        storage.remove(TokenKey);
        // 强制跳转
        window.location.href = "/login";
        return;
      }

      // 记录错误
      logger.error('HTTP Error', {
          url,
          status: response.status,
          statusText: response.statusText,
          data: response._data
      });

      // 显示固定错误信息
      if (process.client) {
          message.error('网络请求失败或服务不可用');
      }
    },
    // 处理请求错误 (网络超时, DNS等)
    onRequestError({ error }: any) {
        logger.error('Request Error', error);
        if (process.client) {
            message.error('请求超时，请检查网络或稍后重试');
        }
    }
  };

  // 合并选项，options 优先级更高
  return useFetch<T>(url, { ...defaults, ...options });
};
