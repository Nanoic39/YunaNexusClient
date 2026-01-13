<template>
  <div class="p-4">
    <div class="mb-4">
      <n-button @click="router.back()">返回列表</n-button>
    </div>

    <n-grid :cols="2" :x-gap="12">
      <n-grid-item>
        <n-card title="基本信息" size="small">
          <n-descriptions bordered :column="1">
            <n-descriptions-item label="ID">
              {{ user?.id }}
            </n-descriptions-item>
            <n-descriptions-item label="用户名">
              {{ user?.username }}
            </n-descriptions-item>
            <n-descriptions-item label="邮箱">
              {{ user?.email }}
            </n-descriptions-item>
            <n-descriptions-item label="UUID">
              {{ user?.uuid }}
            </n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="user?.status === 1 ? 'success' : 'error'">
                {{ user?.status === 1 ? "正常" : "禁用" }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="注册时间">
              {{ formatDate(user?.createTime) }}
            </n-descriptions-item>
          </n-descriptions>
        </n-card>
      </n-grid-item>

      <n-grid-item>
        <n-card title="详细资料" size="small">
          <n-descriptions bordered :column="1">
            <n-descriptions-item label="昵称">
              {{ user?.userInfo?.nickname }}
            </n-descriptions-item>
            <n-descriptions-item label="性别">
              {{ getGenderText(user?.userInfo?.gender) }}
            </n-descriptions-item>
            <n-descriptions-item label="生日">
              {{ formatDate(user?.userInfo?.birthday) || "未设置" }}
            </n-descriptions-item>
            <n-descriptions-item label="简介">
              {{ user?.userInfo?.biography || "暂无简介" }}
            </n-descriptions-item>
            <n-descriptions-item label="经验值">
              {{ user?.userInfo?.experience }}
            </n-descriptions-item>
            <n-descriptions-item label="等级">
              {{ levelText }}
            </n-descriptions-item>
          </n-descriptions>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-card title="拥有角色" size="small" class="mt-4">
      <n-space>
        <n-tag v-for="role in roles" :key="role.id" type="info">
          {{ role.roleName }} ({{ role.roleCode }})
        </n-tag>
        <span v-if="roles.length === 0" class="text-gray-400">暂无角色</span>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { NTag, useMessage } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";
import dayjs from "dayjs";
import { calculateLevel } from "~/utils/level";

definePageMeta({
  layout: "admin-layout",
});

interface UserInfo {
  nickname?: string;
  gender?: number;
  birthday?: string;
  biography?: string;
  experience?: number;
}

interface UserDetail {
  id: number;
  username: string;
  email: string;
  uuid: string;
  status: number;
  createTime: string;
  userInfo?: UserInfo;
}

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
}

const route = useRoute();
const router = useRouter();
const api = useUserManagementApi();
const message = useMessage();

const userId = (() => {
  const id = route.query.id;
  return Array.isArray(id) ? id[0] : (id as string);
})();

const user = ref<UserDetail | null>(null);
const roles = ref<Role[]>([]);
const levelText = ref<string>("-");

const fetchData = async () => {
  try {
    const rolesRes = (await api.fetchUserRoles(Number(userId))) as any;
    if (rolesRes.code === 200) {
      roles.value = rolesRes.data;
    }

    const userRes = (await api.fetchUserDetail(Number(userId))) as any;
    if (userRes.code === 200) {
      user.value = userRes.data;
      const exp = user.value?.userInfo?.experience ?? 0;
      const level = calculateLevel(exp);
      levelText.value = `Lv.${level}`;
    }
  } catch (e) {
    message.error("获取用户详情失败");
  }
};

const getGenderText = (gender?: number) => {
  switch (gender) {
    case 1:
      return "男";
    case 2:
      return "女";
    default:
      return "未知";
  }
};

onMounted(() => {
  if (userId) {
    fetchData();
  }
});

const formatDate = (date?: string | null) => {
  if (!date) return "";
  const d = dayjs(date);
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : "";
};
</script>
