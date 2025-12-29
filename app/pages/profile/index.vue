<script setup lang="ts">
import { useUser } from "~/composables/useUser";
import { useTheme } from "~/composables/useTheme";
import DefaultAvatar from "~/assets/images/avatar/image.png";

definePageMeta({
  layout: "admin-layout",
  middleware: ["auth"], // 确保只有登录用户可以访问
});

const { user } = useUser();
const { isDark } = useTheme();

// 简单的用户信息展示，后续可以扩展
const userProfile = computed(() => user.value);
</script>

<template>
  <div class="space-y-6">
    <!-- 头部卡片 -->
    <div
      class="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border-color)] shadow-sm relative overflow-hidden"
    >
      <div class="flex flex-col md:flex-row items-center gap-6 relative z-10">
        <n-avatar
          :size="100"
          :src="userProfile.userInfo?.avatar || DefaultAvatar"
          :fallback-src="DefaultAvatar"
          class="!rounded-3xl ring-4 ring-[var(--color-primary)]/20 shadow-xl"
        />
        <div
          class="flex flex-col items-center md:items-start text-center md:text-left"
        >
          <h1 class="text-3xl font-bold text-[var(--text-main)] mb-2">
            {{ userProfile.userInfo?.nickname || userProfile.username }}
          </h1>
          <p class="text-[var(--text-secondary)] mb-4 max-w-lg">
            {{
              userProfile.userInfo?.biography || "这个人很懒，什么都没有写..."
            }}
          </p>
          <div class="flex flex-wrap justify-center md:justify-start gap-2">
            <!-- 经验值/等级展示可以放这里 -->
            <n-tag :bordered="false" type="info">
              Level
              {{ Math.floor((userProfile.userInfo?.experience || 0) / 100) }}
            </n-tag>
          </div>
        </div>
      </div>

      <!-- 背景装饰 -->
      <div
        class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
      ></div>
    </div>

    <!-- 详细信息卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm"
      >
        <h3 class="text-lg font-bold text-[var(--text-main)] mb-4">基本信息</h3>
        <div class="space-y-4">
          <div
            class="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0"
          >
            <span class="text-[var(--text-secondary)]">用户 UUID</span>
            <span class="text-[var(--text-main)] font-mono text-xs">{{
              userProfile.uuid
            }}</span>
          </div>
          <div
            class="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0"
          >
            <span class="text-[var(--text-secondary)]">用户名</span>
            <span class="text-[var(--text-main)]">{{
              userProfile.username
            }}</span>
          </div>
          <div
            class="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0"
          >
            <span class="text-[var(--text-secondary)]">邮箱</span>
            <span class="text-[var(--text-main)]">{{
              userProfile.email || "未绑定"
            }}</span>
          </div>
          <div
            class="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0"
          >
            <span class="text-[var(--text-secondary)]">性别</span>
            <span class="text-[var(--text-main)]">{{
              userProfile.userInfo?.gender || "未知"
            }}</span>
          </div>
        </div>
      </div>

      <div
        class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm"
      >
        <h3 class="text-lg font-bold text-[var(--text-main)] mb-4">账号安全</h3>
        <div class="space-y-4">
          <n-button block secondary type="primary">修改密码</n-button>
          <n-button block secondary type="warning">绑定邮箱</n-button>
        </div>
      </div>
    </div>
  </div>
</template>
