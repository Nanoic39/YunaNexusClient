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
    label: "用户管理",
    key: "system",
    iconName: "heroicons:cog-6-tooth",
    path: "/admin",
    children: [
      {
        label: "账号管理",
        key: "user-management",
        iconName: "heroicons:users",
        path: "/admin/user",
        permission: "menu:sys:user:list",
      },
      {
        label: "角色管理",
        key: "role-management",
        iconName: "heroicons:user-group",
        path: "/admin/role",
        permission: "menu:sys:role:list",
      },
      {
        label: "权限管理",
        key: "permission-management",
        iconName: "heroicons:key",
        path: "/admin/permission",
        permission: "menu:sys:permission:list",
      },
      {
        label: "封禁管理",
        key: "ban-management",
        iconName: "heroicons:no-symbol",
        path: "/admin/ban",
        permission: "menu:sys:ban:list",
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
