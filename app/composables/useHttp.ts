import { storage, TokenKey, RefreshTokenKey } from "~/utils/storage";
import { logger } from "~/utils/logger";
import { message } from "~/utils/naive";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useUserStore } from "~/stores/user";
import { API_PREFIX } from "~/composables/api/constants";

// 是否正在刷新 Token (Promise 锁)
let isRefreshing: Promise<any> | null = null;
let fetcher: any;

const SUCCESS_CODE = [200];

export const useHttp = <T>(url: string, options: any = {}): Promise<T> => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  fetcher = $fetch.create({
    baseURL: apiBase,
    // 自动为请求添加 Token
    async onRequest({ options }: any) {
      // 如果正在刷新 Token，等待刷新完成
      if (isRefreshing) {
        try {
          await isRefreshing;
        } catch (e) {
          // 刷新失败，不需要处理，后续逻辑会处理 Token 缺失
        }
      }

      const token = storage.get(TokenKey);
      if (token) {
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${token}`;
      }
    },
    // 处理响应
    onResponse({ response }: any) {
      const res = response._data;
      // 如果 code 不在 SUCCESS_CODE 中存在 ，视为业务错误 (根据后端约定)
      // 这里只记录日志，不抛出错误，以便业务层处理 data.code
      if (res && res.code && !SUCCESS_CODE.includes(res.code)) {
        logger.error("API Error", {
          url,
          code: res.code,
          msg: res.msg,
          tips: res.tips,
        });
      }
    },
    // 处理响应错误 (4xx, 5xx)
    async onResponseError({ response, options, request }: any) {
      // 处理 401 未授权
      if (response.status === 401) {
        const refreshTokenStr = storage.get(RefreshTokenKey);

        // 如果有 RefreshToken 且不是在请求刷新接口本身
        if (refreshTokenStr && !url.includes("/auth/refresh")) {
          // 如果没有正在刷新，开启刷新任务
          if (!isRefreshing) {
            isRefreshing = new Promise(async (resolve, reject) => {
              try {
                const refreshRes: any = await fetcher(
                  `${API_PREFIX.USER}/auth/refresh`,
                  {
                    method: "GET",
                    params: { refreshToken: refreshTokenStr },
                  }
                );

                if (refreshRes && refreshRes.code === 200) {
                  // 刷新成功，更新 Token
                  const userStore = useUserStore();
                  userStore.login(refreshRes.data);
                  resolve(refreshRes.data.token);
                } else {
                  reject(new Error("刷新失败"));
                }
              } catch (e) {
                reject(e);
              }
            });
          }

          try {
            await isRefreshing;
            // 刷新成功后，重试原请求
            // 更新 Authorization 头
            const newToken = storage.get(TokenKey);
            options.headers = options.headers || {};
            options.headers.Authorization = `Bearer ${newToken}`;

            // 递归调用 fetcher 进行重试，onResponseError 中返回响应会作为最终结果
            return fetcher(request as string, options as any);
          } catch (e) {
            // 刷新失败，强制退出
            storage.remove(TokenKey);
            storage.remove(RefreshTokenKey);
            isRefreshing = null;
            if (process.client) {
              window.location.href = "/login";
            }
            throw e; // 继续抛出错误
          } finally {
            // 刷新完成，重置锁
            isRefreshing = null;
          }
        } else {
          // 没有 RefreshToken 或 刷新接口本身报错，直接退出
          storage.remove(TokenKey);
          storage.remove(RefreshTokenKey);
          if (process.client) {
            window.location.href = "/login";
          }
        }
        return;
      }

      // 记录错误
      logger.error("HTTP Error", {
        url,
        status: response.status,
        statusText: response.statusText,
        data: response._data,
      });

      // 显示固定错误信息
      if (process.client) {
        message.error("网络请求失败或服务不可用");
      }
    },
    // 处理请求错误 (网络超时, DNS等)
    onRequestError({ error }: any) {
      logger.error("Request Error", error);
      if (process.client) {
        message.error("请求超时，请检查网络或稍后重试");
      }
    },
  });

  return fetcher(url, { ...options });
};
