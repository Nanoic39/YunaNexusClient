import { storage, TokenKey, RefreshTokenKey } from "~/utils/storage";
import { logger } from "~/utils/logger";
import { message } from "~/utils/naive";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useUserStore } from "~/stores/user";

// 是否正在刷新 Token
let isRefreshing = false;
// 重试队列
let requests: any[] = [];

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
    async onResponseError({ response, options }: any) {
      // 处理 401 未授权
      if (response.status === 401) {
        const refreshTokenStr = storage.get(RefreshTokenKey);
        
        // 如果有 RefreshToken 且不是在请求刷新接口本身
        if (refreshTokenStr && !url.includes('/auth/refresh')) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              // 调用刷新接口
              const { refreshToken } = useAuthApi();
              const { data, error } = await refreshToken(refreshTokenStr);
              
              if (data.value && data.value.code === 200) {
                 // 刷新成功，更新 Token
                 const userStore = useUserStore();
                 userStore.login(data.value.data);
                 
                 // TODO: 重试队列中的请求
                 requests.forEach((cb) => cb(data.value?.data.token));
                 requests = [];
                 
                 // 刷新当前请求的 Token 并重试 (Nuxt useFetch 内部机制较难直接重试，这里通常建议刷新页面或提示用户)
                 // 由于 useFetch 是基于响应式的，这里直接修改 options.headers 并不能触发重试。
                 // 实际业务中，对于重要操作可能需要封装更复杂的 fetch client。
                 // 简单做法：刷新成功后，让用户手动重试或跳转
                 // message.success('会话已自动续期');
                 return; 
              } else {
                 throw new Error("刷新失败");
              }
            } catch (e) {
               // 刷新失败，强制退出
               storage.remove(TokenKey);
               storage.remove(RefreshTokenKey);
               window.location.href = "/login";
            } finally {
              isRefreshing = false;
            }
          } else {
             // 正在刷新，将请求加入队列 (简化处理，暂时忽略)
          }
        } else {
            // 没有 RefreshToken 或 刷新接口本身报错，直接退出
            storage.remove(TokenKey);
            storage.remove(RefreshTokenKey);
            window.location.href = "/login";
        }
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
