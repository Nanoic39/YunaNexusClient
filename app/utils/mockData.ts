export const MOCK_USER_PROFILE = {
  id: 0,
  username: "",
  email: "",
  bio: "",
  banner: "",
  socials: {
    discord: "",
    twitter: "",
    twitch: "",
    osu: "",
  },
  roles: [],
  role: "",
  avatar: "",
  isLoggedIn: false,
};

export const MOCK_MENU_ITEMS = [
  {
    label: "工作台",
    key: "dashboard",
    iconName: "heroicons:squares-2x2",
    path: "/",
  },
  {
    label: "登录/注册",
    key: "auth",
    iconName: "heroicons:arrow-right-on-rectangle",
    path: "/login",
  },
];
