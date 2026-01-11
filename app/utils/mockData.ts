export const MOCK_MENU_ITEMS = [
  {
    label: "工作台",
    key: "dashboard",
    iconName: "heroicons:squares-2x2",
    path: "/",
  },
  {
    label: "文件管理",
    key: "files",
    iconName: "heroicons:folder",
    path: "/files",
    children: [
      {
        label: "我的文件",
        key: "my-files",
        iconName: "heroicons:document-duplicate",
        path: "/files/my-files",
      },
      {
        label: "我的分享",
        key: "my-shares",
        iconName: "heroicons:share",
        path: "/files/my-shares",
      },
      {
        label: "回收站",
        key: "recycle-bin",
        iconName: "heroicons:trash",
        path: "/files/recycle-bin",
      },
    ],
  },
  {
    label: "登录/注册",
    key: "auth",
    iconName: "heroicons:arrow-right-on-rectangle",
    path: "/login",
  },
];
