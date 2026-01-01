export const STORAGE_PREFIX = "yuna_";

export const TokenKey = "token";
export const RefreshTokenKey = "refresh_token";
export const UserKey = "user_info";

export const storage = {
  get<T = any>(key: string): T | null {
    const value = localStorage.getItem(STORAGE_PREFIX + key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (e) {
      // 如果解析失败，说明可能是普通字符串（如 Token），直接返回原值
      return value as unknown as T;
    }
  },

  set(key: string, value: any) {
    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : value;
    localStorage.setItem(STORAGE_PREFIX + key, stringValue);
  },

  remove(key: string) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear() {
    localStorage.clear();
  },
};
