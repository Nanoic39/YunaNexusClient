<script setup lang="ts">
import { useUser } from "~/composables/useUser";
import { useTheme } from "~/composables/useTheme";
import DefaultAvatar from "~/assets/images/avatar/image.png";
import { calculateLevelProgress } from "@/utils/level";
import { useProfileApi } from "~/composables/api/useProfileApi";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useUserStore } from "~/stores/user";
import { storage, TokenKey, RefreshTokenKey, UserKey } from "~/utils/storage";
import AvatarEditor from "./AvatarEditor.vue";
import { message } from "~/utils/naive";
import {
  NInput,
  NSelect,
  NButton,
  NTag,
  NProgress,
  NModal,
  NAvatar,
  NDatePicker,
  NInputGroup,
} from "naive-ui";

definePageMeta({
  layout: "admin-layout",
});

const { user, avatarUrl, refreshAvatar } = useUser();
const { isDark } = useTheme();

// TODO：简单的用户信息展示，后续可以扩展
const userProfile = computed(() => user.value);

// 不再需要本地维护 avatarUrl，直接使用 useUser 提供的响应式 avatarUrl
// 也不需要 watch userProfile 去手动加载头像，Store 会自动管理

// 监听 userProfile 变化，方便调试
watch(
  () => userProfile.value,
  (newVal) => {
    // console.log("UserProfile updated:", newVal);
    // console.log("Avatar ID:", newVal.userInfo?.avatar);
  },
  { deep: true }
);

const levelInfo = computed(() => {
  // 兼容新旧数据结构，优先使用 normalizedUserInfo (flat)，否则尝试 deep nested (old)
  // normalized: userProfile.value.userInfo.experience
  // old: userProfile.value.userInfo.userInfo.experience
  const info = userProfile.value.userInfo;
  // @ts-ignore
  const exp = info?.experience || info?.userInfo?.experience || 0;
  return calculateLevelProgress(exp);
});

const showAvatarEditor = ref(false);
const uploading = ref(false);
const {
  uploadAvatar,
  getUserProfile,
  updateUserProfile,
  changePassword,
  changeEmail,
} = useProfileApi();
const userStore = useUserStore(); // 移除重复定义，useUser 已包含

// 页面加载时刷新用户信息，确保数据结构是最新的
onMounted(() => {
  refreshUserProfile();
});
const { validToken, sendCode } = useAuthApi();

// 简介编辑状态
const isEditingBio = ref(false);
const bioForm = reactive({
  biography: "",
});

// 基本信息编辑状态
const isEditingBasic = ref(false);
const basicForm = reactive({
  nickname: userProfile.value?.userInfo?.nickname || "Yuna#Default",
  gender: 0,
  birthday: null as number | null,
});

const genderOptions = [
  { label: "保密", value: 0 },
  { label: "男", value: 1 },
  { label: "女", value: 2 },
];

// 刷新用户信息
async function refreshUserProfile() {
  try {
    const profileRes = await getUserProfile();
    if (profileRes.code === 200 && profileRes.data) {
      // profileRes.data 是 UserDetailDTO (嵌套结构)
      // 需要将其转换为 UserProfile (扁平结构)
      const backendData = profileRes.data as any;
      const innerInfo = backendData.userInfo || {};

      // 构造符合前端 store 期望的 userInfo 结构 (对齐 UserLoginVO.userInfo)
      // 登录接口返回的 userInfo 包含: nickname, avatar, gender, biography, experience
      // 详情接口返回的 innerInfo (Entity) 包含: nickname, avatarId, gender, biography, experience, birthday

      const normalizedUserInfo = {
        nickname: innerInfo.nickname,
        avatar: innerInfo.avatarId, // 映射 avatarId -> avatar
        gender: innerInfo.gender,
        biography: innerInfo.biography,
        experience: innerInfo.experience,
        birthday: innerInfo.birthday,
      };

      const updatedUser = {
        ...user.value, // 保留旧数据 (isLoggedIn 等)
        uuid: backendData.uuid,
        username: backendData.username,
        email: backendData.email,
        userInfo: normalizedUserInfo, // 更新为标准化的 userInfo 对象
      };

      // 更新用户信息到store和localStorage
      userStore.login({
        ...updatedUser,
        token: storage.get(TokenKey) as any,
        refreshToken: storage.get(RefreshTokenKey) as any,
      });
    }
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
}

// 简介相关方法
function startEditBio() {
  bioForm.biography = userProfile.value.userInfo?.biography || "";
  isEditingBio.value = true;
}

function cancelEditBio() {
  isEditingBio.value = false;
}

async function saveEditBio() {
  try {
    const res = await updateUserProfile({ biography: bioForm.biography });
    if (res.code === 200) {
      message.success("简介更新成功");
      await refreshUserProfile();
      isEditingBio.value = false;
    } else {
      message.error(res.msg || "保存失败");
    }
  } catch (error) {
    console.error("保存失败:", error);
    message.error("保存失败，请稍后重试");
  }
}

// 基本信息相关方法
function startEditBasic() {
  basicForm.nickname = userProfile.value.userInfo?.nickname || "";
  basicForm.gender = userProfile.value.userInfo?.gender || 0;
  // 处理日期：后端不一定返回时间戳（可能之后写着写着就忘了，所以还是校验一下防止这里报错），DatePicker 需要时间戳
  const birth = userProfile.value.userInfo?.birthday;
  basicForm.birthday = birth ? new Date(birth).getTime() : null;
  isEditingBasic.value = true;
}

function cancelEditBasic() {
  isEditingBasic.value = false;
}

async function saveEditBasic() {
  try {
    const payload: any = {
      nickname: basicForm.nickname,
      gender: basicForm.gender,
    };
    if (basicForm.birthday) {
      payload.birthday = new Date(basicForm.birthday);
    }

    const res = await updateUserProfile(payload);
    if (res.code === 200) {
      message.success("基本信息更新成功");
      await refreshUserProfile();
      isEditingBasic.value = false;
    } else {
      message.error(res.msg || "保存失败");
    }
  } catch (error) {
    console.error("保存失败:", error);
    message.error("保存失败，请稍后重试");
  }
}

// 格式化日期显示
function formatDate(dateStr: string | Date | undefined) {
  if (!dateStr) return "未设置";
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// 修改密码相关
const showChangePassword = ref(false);
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const passwordLoading = ref(false);

function openChangePassword() {
  passwordForm.oldPassword = "";
  passwordForm.newPassword = "";
  passwordForm.confirmPassword = "";
  showChangePassword.value = true;
}

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.error("两次输入的密码不一致");
    return;
  }
  if (!passwordForm.newPassword) {
    message.error("请输入新密码");
    return;
  }

  passwordLoading.value = true;
  try {
    const res = await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    if (res.code === 200) {
      message.success("密码修改成功");
      showChangePassword.value = false;
    } else {
      message.error(res.msg || "密码修改失败");
    }
  } catch (e) {
    // error handled in useHttp
  } finally {
    passwordLoading.value = false;
  }
}

// 修改邮箱相关
const showChangeEmail = ref(false);
const emailForm = reactive({
  newEmail: "",
  newEmailCode: "",
  oldEmailCode: "",
});
const emailLoading = ref(false);
const oldCodeTimer = ref(0);
const newCodeTimer = ref(0);

function openChangeEmail() {
  emailForm.newEmail = "";
  emailForm.newEmailCode = "";
  emailForm.oldEmailCode = "";
  showChangeEmail.value = true;
}

async function sendOldCode() {
  if (oldCodeTimer.value > 0) return;
  if (!userProfile.value?.email) return;

  try {
    const res = await sendCode(userProfile.value.email);
    if (res.code === 200) {
      message.success("验证码已发送");
      startTimer(oldCodeTimer);
    } else {
      message.error(res.msg || "发送失败");
    }
  } catch (e) {}
}

async function sendNewCode() {
  if (newCodeTimer.value > 0) return;
  if (!emailForm.newEmail) {
    message.error("请输入新邮箱");
    return;
  }

  try {
    const res = await sendCode(emailForm.newEmail);
    if (res.code === 200) {
      message.success("验证码已发送");
      startTimer(newCodeTimer);
    } else {
      message.error(res.msg || "发送失败");
    }
  } catch (e) {}
}

function startTimer(timerRef: Ref<number>) {
  timerRef.value = 60;
  const interval = setInterval(() => {
    timerRef.value--;
    if (timerRef.value <= 0) {
      clearInterval(interval);
    }
  }, 1000);
}

async function handleChangeEmail() {
  if (!emailForm.newEmail || !emailForm.newEmailCode) {
    message.error("请填写完整信息");
    return;
  }
  if (userProfile.value?.email && !emailForm.oldEmailCode) {
    message.error("请填写旧邮箱验证码");
    return;
  }

  emailLoading.value = true;
  try {
    const res = await changeEmail({
      newEmail: emailForm.newEmail,
      newEmailCode: emailForm.newEmailCode,
      oldEmailCode: userProfile.value?.email
        ? emailForm.oldEmailCode
        : undefined,
    });
    if (res.code === 200) {
      message.success("邮箱修改成功");
      showChangeEmail.value = false;
      await refreshUserProfile();
    } else {
      message.error(res.msg || "邮箱修改失败");
    }
  } catch (e) {
  } finally {
    emailLoading.value = false;
  }
}

onMounted(async () => {
  const token = storage.get(TokenKey) as any;
  if (token) {
    try {
      await validToken(token);
      await refreshUserProfile();
    } catch (error) {
      console.error("验证Token或获取用户信息失败:", error);
    }
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
    if (res.code === 200 && (res.data as any)?.avatarUrl) {
      await refreshUserProfile();
      await refreshAvatar(); // 刷新头像缓存
      showAvatarEditor.value = false;
      message.success("头像修改成功");
    } else {
      message.error(res.msg || "头像上传失败");
    }
  } catch (error) {
    message.error("头像上传出错");
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
        <!-- 头像 -->
        <div
          class="relative group cursor-pointer"
          @click="showAvatarEditor = true"
        >
          <n-avatar
            :round="false"
            :size="100"
            :src="avatarUrl"
            :fallback-src="DefaultAvatar"
            class="!rounded-2xl ring-2 ring-[var(--color-primary)]/20"
          />
        </div>

        <n-modal v-model:show="showAvatarEditor">
          <AvatarEditor
            :initial-src="avatarUrl"
            @save="handleAvatarSaved"
            @cancel="showAvatarEditor = false"
          />
        </n-modal>
        <div
          class="flex flex-col items-center md:items-start text-center md:text-left flex-1"
        >
          <h1 class="text-3xl font-bold text-[var(--text-main)] mb-2">
            {{ userProfile.userInfo?.nickname || userProfile.username }}
          </h1>
          <div class="mb-4 w-full max-w-2xl">
            <div
              class="flex items-start gap-2 justify-center md:justify-start group"
            >
              <p class="text-[var(--text-secondary)]">
                {{
                  userProfile.userInfo?.biography ||
                  "这个人很懒，什么都没有写..."
                }}
              </p>
              <n-button
                text
                type="primary"
                size="small"
                @click="startEditBio"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <template #icon>
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </template>
              </n-button>
            </div>
            <div v-show="isEditingBio" class="space-y-4">
              <n-modal
                v-model:show="isEditingBio"
                preset="card"
                title="编辑个人简介"
                style="width: 600px"
              >
                <n-input
                  v-model:value="bioForm.biography"
                  type="textarea"
                  placeholder="介绍一下自己..."
                  :maxlength="255"
                  show-count
                  :rows="5"
                />
                <template #footer>
                  <div class="flex justify-end gap-2">
                    <n-button @click="cancelEditBio">取消</n-button>
                    <n-button type="primary" @click="saveEditBio"
                      >保存</n-button
                    >
                  </div>
                </template>
              </n-modal>
            </div>
          </div>
          <div class="flex flex-col gap-2 w-full max-w-xs">
            <div class="flex items-center gap-2">
              <n-tag
                :bordered="false"
                type="info"
                size="small"
                class="font-bold"
              >
                Lv.{{ levelInfo.level }}
              </n-tag>
              <span class="text-xs text-[var(--text-secondary)]">
                {{ levelInfo.currentProgress }} /
                {{ levelInfo.requiredProgress }} XP
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

    <!-- 基本信息卡片 -->
    <div class="grid grid-cols-1 gap-6">
      <div
        class="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm"
      >
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-[var(--text-main)]">基本信息</h3>
          <n-button
            v-if="!isEditingBasic"
            size="small"
            secondary
            type="primary"
            @click="startEditBasic"
          >
            编辑资料
          </n-button>
        </div>

        <!-- 编辑模式 -->
        <div v-if="isEditingBasic" class="space-y-6 max-w-2xl">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <label class="text-sm text-[var(--text-secondary)]">昵称</label>
              <n-input
                v-model:value="basicForm.nickname"
                placeholder="请输入昵称"
                maxlength="20"
                show-count
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm text-[var(--text-secondary)]">性别</label>
              <n-select
                v-model:value="basicForm.gender"
                :options="genderOptions"
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm text-[var(--text-secondary)]">生日</label>
              <n-date-picker
                v-model:value="basicForm.birthday"
                type="date"
                clearable
                class="w-full"
              />
            </div>
          </div>
          <div
            class="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]"
          >
            <n-button @click="cancelEditBasic">取消</n-button>
            <n-button type="primary" @click="saveEditBasic">保存更改</n-button>
          </div>
        </div>

        <!-- 展示模式 -->
        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">用户 UUID</span>
              <span class="text-[var(--text-main)] font-mono text-xs">{{
                userProfile.uuid
              }}</span>
            </div>
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">用户名</span>
              <span class="text-[var(--text-main)]">{{
                userProfile.username
              }}</span>
            </div>
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">昵称</span>
              <span class="text-[var(--text-main)]">{{
                userProfile.userInfo?.nickname || "未设置"
              }}</span>
            </div>
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">性别</span>
              <span class="text-[var(--text-main)]">{{
                userProfile.userInfo?.gender === 1
                  ? "男"
                  : userProfile.userInfo?.gender === 2
                    ? "女"
                    : "保密"
              }}</span>
            </div>
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">生日</span>
              <span class="text-[var(--text-main)]">{{
                formatDate(userProfile.userInfo?.birthday)
              }}</span>
            </div>
            <div
              class="flex items-center justify-between py-3 border-b border-[var(--border-color)]"
            >
              <span class="text-[var(--text-secondary)]">邮箱</span>
              <span class="text-[var(--text-main)]">{{
                userProfile.email || "未绑定"
              }}</span>
            </div>
          </div>

          <div
            class="pt-6 mt-2 border-t border-[var(--border-color)] flex gap-4"
          >
            <n-button secondary type="warning" @click="openChangeEmail"
              >绑定/换绑邮箱</n-button
            >
            <n-button secondary type="error" @click="openChangePassword"
              >更改密码</n-button
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码 Modal -->
    <n-modal
      v-model:show="showChangePassword"
      preset="card"
      title="修改密码"
      style="width: 500px"
    >
      <div class="space-y-4">
        <div class="space-y-1">
          <label>旧密码</label>
          <n-input
            type="password"
            show-password-on="click"
            v-model:value="passwordForm.oldPassword"
            placeholder="请输入旧密码"
          />
        </div>
        <div class="space-y-1">
          <label>新密码</label>
          <n-input
            type="password"
            show-password-on="click"
            v-model:value="passwordForm.newPassword"
            placeholder="请输入新密码"
          />
        </div>
        <div class="space-y-1">
          <label>确认新密码</label>
          <n-input
            type="password"
            show-password-on="click"
            v-model:value="passwordForm.confirmPassword"
            placeholder="请再次输入新密码"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showChangePassword = false">取消</n-button>
          <n-button
            type="primary"
            :loading="passwordLoading"
            @click="handleChangePassword"
            >确认修改</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- 修改邮箱 Modal -->
    <n-modal
      v-model:show="showChangeEmail"
      preset="card"
      title="绑定/更换邮箱"
      style="width: 500px"
    >
      <div class="space-y-4">
        <div v-if="userProfile.email" class="space-y-1">
          <label>当前邮箱: {{ userProfile.email }}</label>
          <n-input-group>
            <n-input
              v-model:value="emailForm.oldEmailCode"
              placeholder="请输入当前邮箱验证码"
            />
            <n-button :disabled="oldCodeTimer > 0" @click="sendOldCode">
              {{ oldCodeTimer > 0 ? `${oldCodeTimer}s` : "获取验证码" }}
            </n-button>
          </n-input-group>
        </div>
        <div class="space-y-1">
          <label>新邮箱</label>
          <n-input
            v-model:value="emailForm.newEmail"
            placeholder="请输入新邮箱"
          />
        </div>
        <div class="space-y-1">
          <label>新邮箱验证码</label>
          <n-input-group>
            <n-input
              v-model:value="emailForm.newEmailCode"
              placeholder="请输入新邮箱验证码"
            />
            <n-button :disabled="newCodeTimer > 0" @click="sendNewCode">
              {{ newCodeTimer > 0 ? `${newCodeTimer}s` : "获取验证码" }}
            </n-button>
          </n-input-group>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showChangeEmail = false">取消</n-button>
          <n-button
            type="primary"
            :loading="emailLoading"
            @click="handleChangeEmail"
            >确认修改</n-button
          >
        </div>
      </template>
    </n-modal>
  </div>
</template>
