<script setup lang="ts">
import { useUser } from "~/composables/useUser";
import { useTheme } from "~/composables/useTheme";
import DefaultAvatar from "~/assets/images/avatar/image.png";
import { calculateLevelProgress } from "@/utils/level";
import { useProfileApi } from "~/composables/api/useProfileApi";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useUserStore } from "~/stores/user";
import { storage, TokenKey, RefreshTokenKey } from "~/utils/storage";
import AvatarEditor from "./AvatarEditor.vue";
import { onMounted } from "vue";

definePageMeta({
  layout: "admin-layout",
  middleware: ["auth"], // 确保只有登录用户可以访问
});

const { user } = useUser();
const { isDark } = useTheme();

// 简单的用户信息展示，后续可以扩展
const userProfile = computed(() => user.value);

const levelInfo = computed(() => {
  const exp = userProfile.value.userInfo?.experience || 0;
  return calculateLevelProgress(exp);
});

const showAvatarEditor = ref(false);
const uploading = ref(false);
const { uploadAvatar } = useProfileApi();
const userStore = useUserStore();
const { validToken } = useAuthApi();
onMounted(async () => {
  const token = storage.get(TokenKey) as any;
  if (token) {
    try {
      await validToken(token);
    } catch {}
  } else {
    userStore.logout();
    navigateTo("/login");
  }
});

function openAvatarEditor() {
  showAvatarEditor.value = true;
}

async function handleAvatarSaved(blob: Blob) {
  uploading.value = true;
  try {
    const res = await uploadAvatar(blob);
    if (res.code === 200 && res.data?.avatarUrl) {
      const baseline: any = (storage.get(UserKey) as any) || (userStore.user.value as any) || {};
      const updated = {
        ...baseline,
        userInfo: { ...(baseline.userInfo || {}), avatar: res.data.avatarUrl },
      };
      userStore.login({
        ...updated,
        token: storage.get(TokenKey) as any,
        refreshToken: storage.get(RefreshTokenKey) as any,
      });
      showAvatarEditor.value = false;
    }
  } finally {
    uploading.value = false;
  }
}
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
          :round="false"
          class="rounded-2xl ring-4 ring-[var(--color-primary)]/20 shadow-xl cursor-pointer"
          @click="openAvatarEditor"
        />

        <n-modal v-model:show="showAvatarEditor">
          <AvatarEditor
            :initial-src="userProfile.userInfo?.avatar || DefaultAvatar"
            @save="handleAvatarSaved"
            @cancel="showAvatarEditor=false"
          />
        </n-modal>
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
          <div class="flex flex-col gap-2 w-full max-w-xs">
            <div class="flex items-center gap-2">
              <n-tag :bordered="false" type="info" size="small" class="font-bold">
                Lv.{{ levelInfo.level }}
              </n-tag>
              <span class="text-xs text-[var(--text-secondary)]">
                {{ levelInfo.currentProgress }} / {{ levelInfo.requiredProgress }} XP
              </span>
            </div>
            <n-progress
              type="line"
              :percentage="Number(levelInfo.percentage)"
              :show-indicator="false"
              :height="6"
              :border-radius="4"
              processing
              color="var(--color-primary)"
              rail-color="rgba(128, 128, 128, 0.2)"
            />
          </div>
        </div>
      </div>


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
