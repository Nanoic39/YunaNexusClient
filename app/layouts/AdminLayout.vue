<script setup lang="ts">
import { h, ref, nextTick, onMounted, onUnmounted, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Icon } from "#components"; // 确保使用 Nuxt Icon 组件
import { useTheme } from "~/composables/useTheme";
import { useMenuApi } from "~/composables/api/useMenuApi";
import { useUser } from "~/composables/useUser";

// Assets
import LogoSquare from "~/assets/images/logo/logo_square.svg";
import DefaultAvatar from "~/assets/images/avatar/image.png";

const { isDark, toggleTheme } = useTheme();
const { fetchMenuItems } = useMenuApi();
const { user, logout } = useUser();
const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const rawMenuItems = ref<any[]>([]);
const activeKey = ref<string | null>(null);
const isLoading = ref(true);
const userProfile = user;
const isMobile = ref(false);
const showMobileMenu = ref(false);
const isPageLoading = ref(false);
let timeoutId: number | null = null;

// Page transition loading state
const removeBeforeEach = router.beforeEach((to, from, next) => {
  if (to.path !== from.path) {
    isPageLoading.value = true;
  }
  next();
});

const removeAfterEach = router.afterEach(() => {
  setTimeout(() => {
    isPageLoading.value = false;
  }, 300);
});

const menuOptions = computed(() => {
  const items = rawMenuItems.value.filter((item: any) => {
    if (userProfile.value.isLoggedIn && item.key === "auth") return false;
    return true;
  });

  return items.map((item: any) => ({
    ...item,
    icon: renderIcon(item.iconName),
  }));
});

function checkMobile() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = window.setTimeout(() => {
    isMobile.value = window.innerWidth < 768;
    if (!isMobile.value) showMobileMenu.value = false;
  }, 100);
}

function matchRouteToMenu() {
  if (!menuOptions.value.length) return;

  const currentPath = route.path;

  // 如果是 profile 页面，不进行菜单高亮匹配，或者你可以添加一个专门的 profile 菜单项
  if (currentPath.startsWith("/profile")) {
    activeKey.value = null;
    return;
  }

  const matched = menuOptions.value.find((item: any) => {
    if (item.path === "/") return currentPath === "/";
    return currentPath === item.path || currentPath.startsWith(item.path + "/");
  });

  if (matched) {
    activeKey.value = matched.key;
  } else {
    activeKey.value = null;
  }
}

watch(menuOptions, () => {
  matchRouteToMenu();
});

onMounted(async () => {
  try {
    rawMenuItems.value = (await fetchMenuItems()) as any[];

    matchRouteToMenu();
    checkMobile();
    window.addEventListener("resize", checkMobile);
  } finally {
    // Add a small buffer to ensure smooth transition
    setTimeout(() => {
      isLoading.value = false;
    }, 300);
  }
});

onUnmounted(() => {
  removeBeforeEach();
  removeAfterEach();
  if (timeoutId) clearTimeout(timeoutId);
  if (import.meta.client) {
    window.removeEventListener("resize", checkMobile);
  }
});

watch(
  () => route.path,
  () => {
    matchRouteToMenu();
    if (isMobile.value) {
      showMobileMenu.value = false;
    }
  }
);

function handleThemeToggle(event: MouseEvent) {
  if (!document.startViewTransition) {
    toggleTheme();
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y)
  );

  const transition = document.startViewTransition(async () => {
    toggleTheme();
    await nextTick();
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 500,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
}

function renderIcon(name: string) {
  return () => h(Icon, { name, class: "text-lg" });
}

function handleMenuUpdate(key: string, item: any) {
  if (item.path) {
    router.push(item.path);
  }
}

function handleProfileSelect(key: string) {
  if (key === "login") {
    router.push("/login");
  } else if (key === "logout") {
    logout();
    router.push("/login");
  }
}

const breadcrumbs = computed(() => {
  const items = [{ label: "首页", path: "/", clickable: true }];

  if (route.path === "/") return items;

  // 1. Try to find in menu options
  const currentMenu = menuOptions.value.find(
    (item: any) => item.key === activeKey.value
  );

  if (currentMenu) {
    items.push({
      label: currentMenu.label,
      path: currentMenu.path,
      clickable: false,
    });
  } else {
    // 2. Try route meta title or fallback map
    const title = (route.meta.title as string) || getPageTitle(route.path);
    items.push({
      label: title,
      path: route.path,
      clickable: false,
    });
  }

  return items;
});

function getPageTitle(path: string): string {
  if (path.startsWith("/login")) return "登录";
  if (path.startsWith("/register")) return "注册";
  return "当前页面";
}
</script>

<template>
  <div class="h-screen w-full overflow-hidden">
    <Transition
      enter-active-class="transition-opacity duration-500 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <div
        v-if="isLoading"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-layout-body)] transition-colors duration-300"
      >
        <div class="relative w-24 h-24 mb-8">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin"></div>
          </div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <h2
            class="text-2xl font-bold text-[var(--color-primary)] tracking-widest"
          >
            YUNA NEXUS CORE
          </h2>
          <div class="flex items-center gap-1">
            <span
              class="w-1.5 h-1.5 rounded-full bg-[#6692E1] animate-[bounce_1s_infinite_100ms]"
            ></span>
            <span
              class="w-1.5 h-1.5 rounded-full bg-[#7FA4E8] animate-[bounce_1s_infinite_200ms]"
            ></span>
            <span
              class="w-1.5 h-1.5 rounded-full bg-[#94A3B8] animate-[bounce_1s_infinite_300ms]"
            ></span>
          </div>
        </div>
      </div>

      <n-layout
        v-else
        :has-sider="!isMobile"
        class="h-full bg-[var(--bg-layout-body)]"
      >
        <n-layout-sider
          v-if="!isMobile"
          bordered
          collapse-mode="width"
          :collapsed-width="80"
          :width="260"
          :collapsed="collapsed"
          @collapse="collapsed = true"
          @expand="collapsed = false"
          class="z-50 shadow-2xl transition-all duration-300 relative group"
        >
          <div
            class="h-full flex flex-col bg-[var(--bg-layout-sider)] transition-colors duration-300"
          >
            <!-- Logo Area -->
            <div
              class="h-20 flex items-center justify-center overflow-hidden whitespace-nowrap px-4 shrink-0 transition-colors duration-300 border-b border-[var(--border-color)]"
            >
              <div
                class="flex items-center gap-3 text-[var(--text-main)] transition-all duration-300 ease-in-out"
                :class="{ 'scale-90': collapsed }"
              >
                <div class="w-10 h-10 shrink-0 z-10">
                  <img
              :src="LogoSquare"
              alt="Yuna Logo"
              width="48"
              height="48"
              decoding="async"
              loading="lazy"
              class="w-full h-full object-contain"
            />
                </div>
                <div
                  class="flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
                  :class="
                    collapsed
                      ? 'w-0 opacity-0 -translate-x-4'
                      : 'w-32 opacity-100 translate-x-0'
                  "
                >
                  <span
                    class="font-bold text-lg tracking-wide text-[var(--text-main)] leading-none whitespace-nowrap"
                  >
                    YUNA NEXUS
                  </span>
                  <span
                    class="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-wider whitespace-nowrap"
                    >Core System</span
                  >
                </div>
              </div>
            </div>

            <!-- Menu Area -->
            <n-menu
              v-model:value="activeKey"
              :options="menuOptions"
              :collapsed="collapsed"
              :collapsed-width="80"
              :collapsed-icon-size="24"
              :icon-size="22"
              accordion
              :indent="24"
              class="flex-1 py-4"
              @update:value="handleMenuUpdate"
            />

            <!-- Collapse Button -->
            <div
              class="h-14 shrink-0 flex items-center justify-center border-t border-[var(--border-color)] hover:bg-[var(--bg-layout-body)] transition-colors cursor-pointer group/btn"
              @click="collapsed = !collapsed"
            >
              <div
                class="flex items-center gap-2 text-[var(--text-secondary)] group-hover/btn:text-[var(--color-primary)] transition-colors"
              >
                <Icon
                  :name="
                    collapsed
                      ? 'heroicons:chevron-double-right'
                      : 'heroicons:chevron-double-left'
                  "
                  class="text-xl transition-transform duration-300 group-hover/btn:scale-110"
                />
                <span
                  class="text-xs font-medium uppercase tracking-widest whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden"
                  :class="collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'"
                ></span>
              </div>
            </div>
          </div>
        </n-layout-sider>

        <n-layout class="flex flex-col bg-transparent">
          <n-layout-header
            bordered
            class="h-16 flex items-center justify-between px-4 md:px-6 bg-[var(--bg-header)] backdrop-blur-xl sticky top-0 z-40 shadow-sm transition-all border-b border-[var(--border-color)]"
          >
            <div class="flex items-center gap-4">
              <n-button
                v-if="isMobile"
                circle
                quaternary
                @click="showMobileMenu = true"
                class="mr-2"
              >
                <template #icon>
                  <Icon name="heroicons:bars-3" />
                </template>
              </n-button>

              <!-- 面包屑或其他导航辅助 -->
              <n-breadcrumb class="hidden md:block">
                <n-breadcrumb-item
                  v-for="item in breadcrumbs"
                  :key="item.path"
                  @click="item.clickable && $router.push(item.path)"
                  :class="{ 'cursor-pointer': item.clickable }"
                >
                  {{ item.label }}
                </n-breadcrumb-item>
              </n-breadcrumb>

              <!-- 移动端 Logo -->
              <div v-if="isMobile" class="flex items-center gap-2">
                <div class="w-8 h-8">
                  <img
                    :src="LogoSquare"
                    alt="Yuna Logo"
                    width="40"
                    height="40"
                    decoding="async"
                    loading="lazy"
                    class="w-full h-full object-contain"
                  />
                </div>
                <span class="font-bold text-[var(--text-main)]"
                  >YUNA NEXUS</span
                >
              </div>
            </div>

            <div class="flex items-center gap-2 md:gap-4">
              <n-button circle quaternary @click="handleThemeToggle">
                <template #icon>
                  <Icon :name="isDark ? 'heroicons:moon' : 'heroicons:sun'" />
                </template>
              </n-button>

              <n-popover
                trigger="hover"
                placement="bottom-end"
                :show-arrow="false"
                raw
                :style="{
                  padding: 0,
                  backgroundColor: 'transparent',
                  borderRadius: '12px',
                }"
              >
                <template #trigger>
                  <div
                    class="flex items-center gap-3 cursor-pointer bg-[var(--bg-card)] hover:bg-[var(--color-primary)]/5 border border-[var(--border-color)] hover:border-[var(--color-primary)]/30 pl-1.5 pr-3 py-1 rounded-xl transition-all duration-300 hover:shadow-sm group"
                  >
                    <n-avatar
                      :size="32"
                      :src="
                        userProfile.isLoggedIn
                          ? userProfile.userInfo?.userInfo?.avatar || DefaultAvatar
                          : 'https://osu.ppy.sh/images/layout/avatar-guest.png'
                      "
                      :fallback-src="DefaultAvatar"
                      class="!rounded-lg block ring-1 ring-white/50 dark:ring-gray-700/50 transition-transform group-hover:scale-105"
                    />
                    <div
                      class="flex-col text-left hidden md:flex justify-center h-full mr-1"
                    >
                      <span
                        class="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--color-primary)] transition-colors leading-none mb-0.5"
                        >{{
                          userProfile.isLoggedIn
                            ? userProfile.userInfo?.userInfo?.nickname ||
                              userProfile.username
                            : "Guest"
                        }}</span
                      >
                      <span
                        class="text-xs text-[var(--text-secondary)] truncate max-w-[100px] leading-none opacity-80"
                      >
                        <template v-if="!userProfile.isLoggedIn"
                          >Visitor</template
                        >
                        <template v-else> Member </template>
                      </span>
                    </div>
                    <Icon
                      name="heroicons:chevron-down"
                      class="text-[var(--text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors text-xs hidden md:block"
                    />
                  </div>
                </template>

                <div
                  class="w-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden p-4 relative"
                >
                  <template v-if="userProfile.isLoggedIn">
                    <!-- Header -->
                    <div
                      class="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--border-color)]"
                    >
                      <n-avatar
                        :size="56"
                        :src="userProfile.userInfo?.userInfo?.avatar || DefaultAvatar"
                        :fallback-src="DefaultAvatar"
                        class="!rounded-2xl ring-2 ring-[var(--color-primary)]/20"
                      />
                      <div class="flex flex-col overflow-hidden">
                        <span
                          class="font-bold text-lg text-[var(--text-main)] truncate"
                          >{{
                            userProfile.userInfo?.userInfo?.nickname ||
                            userProfile.username
                          }}</span
                        >
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="grid grid-cols-1 gap-2">
                      <n-button
                        class="!rounded-lg"
                        secondary
                        @click="router.push('/profile')"
                      >
                        <template #icon
                          ><Icon name="heroicons:user-circle"
                        /></template>
                        个人主页
                      </n-button>
                      <n-button
                        class="!rounded-lg"
                        type="error"
                        secondary
                        @click="handleProfileSelect('logout')"
                      >
                        <template #icon
                          ><Icon name="heroicons:arrow-right-on-rectangle"
                        /></template>
                        退出登录
                      </n-button>
                    </div>
                  </template>

                  <template v-else>
                    <div class="flex flex-col items-center justify-center py-4">
                      <div
                        class="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]"
                      >
                        <Icon name="heroicons:user" class="text-3xl" />
                      </div>
                      <h3
                        class="font-bold text-lg text-[var(--text-main)] mb-1"
                      >
                        欢迎访问
                      </h3>
                      <p
                        class="text-xs text-[var(--text-secondary)] mb-4 text-center"
                      >
                        登录以体验完整功能
                      </p>
                      <n-button
                        type="primary"
                        block
                        class="!rounded-lg"
                        @click="handleProfileSelect('login')"
                      >
                        登录 / 注册
                      </n-button>
                    </div>
                  </template>
                </div>
              </n-popover>
            </div>
          </n-layout-header>

          <n-layout-content
            content-style="min-height: 100%; display: flex; flex-direction: column;"
            class="flex-1 relative"
          >
            <Transition
              enter-active-class="transition-opacity duration-300 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition-opacity duration-300 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div
                v-if="isPageLoading"
                class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-layout-body)]/80 backdrop-blur-sm"
                :style="{
                  left: isMobile ? '0' : collapsed ? '80px' : '260px',
                  top: '64px',
                }"
              >
                <div class="flex flex-col items-center gap-4">
                  <div
                    class="w-12 h-12 animate-spin shadow-lg flex items-center justify-center rounded-full"
                  >
                    <img
                      :src="LogoSquare"
                      alt="Yuna Logo"
                      class="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    class="text-[var(--color-primary)] font-bold text-sm tracking-wider animate-pulse"
                    >LOADING...</span
                  >
                </div>
              </div>
            </Transition>

            <main
              class="flex-1 w-full max-w-[1600px] mx-auto p-4 flex flex-col relative z-0"
            >
              <slot />
            </main>

            <n-layout-footer
              class="bg-transparent text-center p-4 text-[var(--text-tertiary)] text-xs z-0"
            >
              &copy; 2025 YunaNexusCore. All Rights Reserved.
            </n-layout-footer>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </Transition>

    <!-- Mobile Drawer Menu -->
    <n-drawer v-model:show="showMobileMenu" placement="left" :width="280">
      <n-drawer-content body-content-style="padding: 0;">
        <div class="h-full flex flex-col bg-[var(--bg-layout-sider)]">
          <!-- Logo Area -->
          <div
            class="h-20 flex items-center justify-center px-4 shrink-0 border-b border-[var(--border-color)]"
          >
            <div class="flex items-center gap-3 text-[var(--text-main)]">
              <div class="w-10 h-10 shrink-0">
                <img
                  :src="LogoSquare"
                  alt="Yuna Logo"
                  class="w-full h-full object-contain"
                />
              </div>
              <div class="flex flex-col">
                <span
                  class="font-bold text-lg tracking-wide text-[var(--text-main)] leading-none"
                >
                  YUNA NEXUS
                </span>
                <span
                  class="text-[10px] text-[var(--text-secondary)] mt-1 uppercase tracking-wider"
                  >Core System</span
                >
              </div>
            </div>
          </div>

          <!-- Menu Area -->
          <n-menu
            v-model:value="activeKey"
            :options="menuOptions"
            :icon-size="22"
            accordion
            :indent="24"
            class="flex-1 py-4"
            @update:value="handleMenuUpdate"
          />
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
