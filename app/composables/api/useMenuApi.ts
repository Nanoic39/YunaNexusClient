import { MOCK_MENU_ITEMS } from "~/utils/mockData";

export const useMenuApi = () => {
  // 模拟异步请求
  const fetchMenuItems = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_MENU_ITEMS);
      }, 500);
    });
  };

  return {
    fetchMenuItems,
  };
};
