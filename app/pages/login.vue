<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { Icon } from "#components";
import { useUser } from "~/composables/useUser";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { logger } from "~/utils/logger";

// Assets
import LogoSquare from "~/assets/images/logo/logo_square.svg";

definePageMeta({
  layout: "admin-layout",
});

const router = useRouter();
const message = useMessage();
const { login, user } = useUser();
const {
  login: apiLogin,
  loginByCode: apiLoginByCode,
  sendCode: apiSendCode,
  checkEmail: apiCheckEmail,
  register: apiRegister,
} = useAuthApi();
const activeTab = ref("login");
const errorMessage = ref("");
const getSafeErrorMessage = (err: any, fallback: string) => {
  try {
    // 过滤掉包含 URL、localhost、IP 地址的错误消息
    const msg = String((err && err.message) || (err && err.tips) || "");
    if (!msg) return fallback;
    if (
      /https?:\/\//i.test(msg) ||
      /localhost/i.test(msg) ||
      /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(msg)
    )
      return fallback;
    if (
      /Failed to fetch|timeout|NetworkError|ECONN|ENET|DNS|No response/i.test(
        msg
      )
    )
      return "网络请求失败或服务不可用";
    return fallback;
  } catch {
    return fallback;
  }
};

onMounted(() => {
  // 检查是否已登录，如果已登录则跳转到首页
  if (user.value.isLoggedIn) {
    // message.warning("您已登录，无需重复操作"); // 移除此提示，体验更好
    router.replace("/");
  }
});

// Login Form (Password)
const loginFormRef = ref();
const loginModel = reactive({
  username: "",
  password: "",
  remember: false,
});
const loginRules = {
  username: { required: true, message: "请输入用户名/邮箱", trigger: "blur" },
  password: { required: true, message: "请输入密码", trigger: "blur" },
};

// Login Form (Email Code)
const emailLoginFormRef = ref();
const emailLoginModel = reactive({
  email: "",
  code: "",
});
const emailLoginRules = {
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" },
  ],
  code: { required: true, message: "请输入验证码", trigger: "blur" },
};
const codeCounting = ref(false);
const codeCount = ref(60);

// Register Form
const registerFormRef = ref();
const registerModel = reactive({
  username: "",
  email: "",
  code: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  gender: null as number | null,
  agreement: false,
});
const registerRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      validator: (rule: any, value: string) => !/[@.]/.test(value),
      message: "用户名不能包含 '@' 或 '.'",
      trigger: "blur",
    },
  ],
  email: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入正确的邮箱格式", trigger: "blur" },
  ],
  code: { required: true, message: "请输入验证码", trigger: "blur" },
  password: { required: true, message: "请输入密码", trigger: "blur" },
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
    {
      validator: (rule: any, value: string) => {
        return value === registerModel.password;
      },
      message: "两次输入的密码不一致",
      trigger: "blur",
    },
  ],
  agreement: {
    validator: (rule: any, value: boolean) => value === true,
    message: "请阅读并同意用户协议",
    trigger: "change",
  },
};

const genderOptions = [
  { label: "男", value: 1 },
  { label: "女", value: 2 },
  { label: "保密", value: 0 },
];

const loading = ref(false);

const registerCodeCounting = ref(false);
const registerCodeCount = ref(60);

async function handleRegisterSendCode() {
  errorMessage.value = "";
  if (!registerModel.email) {
    errorMessage.value = "请先输入邮箱";
    return;
  }
  // Simple email regex check
  if (!/^\S+@\S+\.\S+$/.test(registerModel.email)) {
    errorMessage.value = "邮箱格式不正确";
    return;
  }

  loading.value = true;
  try {
    const data = await apiSendCode(registerModel.email);

    if (data.code !== 200) {
      throw new Error(data.tips || "发送失败");
    }

    message.success("验证码已发送，请查收");
    registerCodeCounting.value = true;
    registerCodeCount.value = 60;
    const timer = setInterval(() => {
      registerCodeCount.value--;
      if (registerCodeCount.value <= 0) {
        clearInterval(timer);
        registerCodeCounting.value = false;
      }
    }, 1000);
  } catch (err: any) {
    errorMessage.value =
      "发送验证码失败: " + getSafeErrorMessage(err, "未知错误");
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await loginFormRef.value?.validate();

    const data = await apiLogin({
      account: loginModel.username,
      password: loginModel.password,
    });

    if (data.code !== 200) {
      throw new Error(data.tips || "登录失败");
    }

    const userData = data.data;

    // Update user state
    login({
      ...userData,
      isLoggedIn: true,
    });

    message.success("登录成功，欢迎回来！");
    router.push("/");
  } catch (errors: any) {
    logger.error("Login Failed", errors);
    errorMessage.value = getSafeErrorMessage(errors, "登录失败");
  } finally {
    loading.value = false;
  }
}

async function handleSendCode() {
  errorMessage.value = "";
  if (!emailLoginModel.email) {
    errorMessage.value = "请先输入邮箱";
    return;
  }
  // Simple email regex check
  if (!/^\S+@\S+\.\S+$/.test(emailLoginModel.email)) {
    errorMessage.value = "邮箱格式不正确";
    return;
  }

  loading.value = true;
  try {
    const data = await apiSendCode(emailLoginModel.email);

    if (data.code !== 200) {
      throw new Error(data.tips || "发送失败");
    }

    message.success("验证码已发送，请查收");
    codeCounting.value = true;
    codeCount.value = 60;
    const timer = setInterval(() => {
      codeCount.value--;
      if (codeCount.value <= 0) {
        clearInterval(timer);
        codeCounting.value = false;
      }
    }, 1000);
  } catch (err: any) {
    errorMessage.value =
      "发送验证码失败: " + (err.message || err.tips || "未知错误");
  } finally {
    loading.value = false;
  }
}

// Auto Register Modal
const showAutoRegisterModal = ref(false);
const autoRegisterModel = reactive({
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  gender: null as number | null,
});
const autoRegisterRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      validator: (rule: any, value: string) => !/[@.]/.test(value),
      message: "用户名不能包含 '@' 或 '.'",
      trigger: "blur",
    },
  ],
  password: { required: true, message: "请输入密码", trigger: "blur" },
  confirmPassword: [
    { required: true, message: "请确认密码", trigger: "blur" },
    {
      validator: (rule: any, value: string) => {
        return value === autoRegisterModel.password;
      },
      message: "两次输入的密码不一致",
      trigger: "blur",
    },
  ],
};
const autoRegisterFormRef = ref();

async function handleAutoRegister() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await autoRegisterFormRef.value?.validate();

    const data = await apiLoginByCode({
      email: emailLoginModel.email,
      code: emailLoginModel.code,
      username: autoRegisterModel.username,
      password: autoRegisterModel.password,
      nickname: autoRegisterModel.nickname,
      gender: autoRegisterModel.gender,
    });

    if (data.code !== 200) {
      throw new Error(data.tips || "注册并登录失败");
    }

    const userData = data.data;

    login({
      ...userData,
      isLoggedIn: true,
    });

    message.success("注册成功并已登录");
    showAutoRegisterModal.value = false;
    router.push("/");
  } catch (errors: any) {
    logger.error("Auto Register Failed", errors);
    errorMessage.value = getSafeErrorMessage(errors, "注册失败");
  } finally {
    loading.value = false;
  }
}

async function handleEmailLogin() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await emailLoginFormRef.value?.validate();

    // Check if email exists
    const checkData = await apiCheckEmail(emailLoginModel.email);

    // No explicit error check needed as useHttp handles it or throws
    const isEmailRegistered = checkData.data;

    if (!isEmailRegistered) {
      // Show modal to set username and password
      showAutoRegisterModal.value = true;
      loading.value = false;
      return;
    }

    // Standard Login
    const data = await apiLoginByCode({
      email: emailLoginModel.email,
      code: emailLoginModel.code,
    });

    if (data.code !== 200) {
      throw new Error(data.tips || "登录失败");
    }

    const userData = data.data;

    login({
      ...userData,
      isLoggedIn: true,
    });

    message.success("登录成功");
    router.push("/");
  } catch (errors: any) {
    logger.error("Email Login Failed", errors);
    errorMessage.value = getSafeErrorMessage(errors, "登录失败");
  } finally {
    // Only reset loading if not showing modal (modal handling has its own loading state management)
    if (!showAutoRegisterModal.value) {
      loading.value = false;
    }
  }
}

async function handleRegister() {
  loading.value = true;
  try {
    await registerFormRef.value?.validate();

    const data = await apiRegister({
      username: registerModel.username,
      email: registerModel.email,
      verifyCode: registerModel.code,
      password: registerModel.password,
      nickname: registerModel.nickname,
      gender: registerModel.gender,
    });

    if (data.code !== 200) {
      throw new Error(data.tips || "注册失败");
    }

    message.success("注册成功，请登录");
    activeTab.value = "login";
  } catch (errors: any) {
    logger.error("Register Failed", errors);
    errorMessage.value = errors.message || errors.tips || "注册失败";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-[calc(100vh-200px)] flex items-center justify-center py-10 relative"
  >
    <div
      class="w-full max-w-md bg-[var(--bg-card)] rounded-2xl shadow-2xl p-8 border border-[var(--border-color)] relative overflow-hidden"
    >
      <!-- Background Decorations -->
      <div
        class="absolute -top-20 -right-20 w-60 h-60 bg-[var(--color-primary)]/10 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute -bottom-20 -left-20 w-60 h-60 bg-[var(--color-success)]/10 rounded-full blur-3xl"
      ></div>

      <div class="relative z-10">
        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto mb-4">
            <img
              :src="LogoSquare"
              alt="Yuna Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <h1 class="text-2xl font-bold text-[var(--text-main)]">
            {{ activeTab === "register" ? "创建账号" : "欢迎回来" }}
          </h1>
          <p class="text-[var(--text-secondary)] text-sm mt-2">
            Yuna Nexus Core
          </p>
        </div>

        <n-collapse-transition :show="!!errorMessage">
          <n-alert
            title="出错了"
            type="error"
            closable
            class="mb-6"
            @close="errorMessage = ''"
          >
            {{ errorMessage }}
          </n-alert>
        </n-collapse-transition>

        <n-tabs
          v-model:value="activeTab"
          class="custom-tabs"
          animated
          justify-content="space-evenly"
          type="segment"
        >
          <n-tab-pane name="login" tab="密码登录">
            <n-form
              ref="loginFormRef"
              :model="loginModel"
              :rules="loginRules"
              size="large"
              class="mt-6"
            >
              <n-form-item path="username" label="用户名 / 邮箱">
                <n-input
                  v-model:value="loginModel.username"
                  placeholder="请输入用户名或邮箱"
                >
                  <template #prefix>
                    <Icon
                      name="heroicons:user"
                      class="text-[var(--text-tertiary)] w-5 h-5"
                    />
                  </template>
                </n-input>
              </n-form-item>
              <n-form-item path="password" label="密码">
                <n-input
                  v-model:value="loginModel.password"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入密码"
                  @keydown.enter.prevent="handleLogin"
                >
                  <template #prefix>
                    <Icon
                      name="heroicons:lock-closed"
                      class="text-[var(--text-tertiary)] w-5 h-5"
                    />
                  </template>
                </n-input>
              </n-form-item>
              <div class="flex justify-between items-center mb-6">
                <n-checkbox v-model:checked="loginModel.remember">
                  记住我
                </n-checkbox>
                <n-button text type="primary" size="small">
                  忘记密码？
                </n-button>
              </div>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleLogin"
                class="!rounded-xl shadow-lg shadow-blue-500/20"
              >
                登录
              </n-button>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="email-login" tab="验证码登录">
            <n-form
              ref="emailLoginFormRef"
              :model="emailLoginModel"
              :rules="emailLoginRules"
              size="large"
              class="mt-6"
            >
              <n-form-item path="email" label="邮箱">
                <n-input
                  v-model:value="emailLoginModel.email"
                  placeholder="请输入邮箱"
                >
                  <template #prefix>
                    <Icon
                      name="heroicons:envelope"
                      class="text-[var(--text-tertiary)]"
                    />
                  </template>
                </n-input>
              </n-form-item>
              <n-form-item path="code" label="验证码">
                <n-input-group>
                  <n-input
                    v-model:value="emailLoginModel.code"
                    placeholder="请输入验证码"
                    @keydown.enter.prevent="handleEmailLogin"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:shield-check"
                        class="text-[var(--text-tertiary)] w-5 h-5"
                      />
                    </template>
                  </n-input>
                  <n-button
                    ghost
                    :disabled="codeCounting || loading"
                    @click="handleSendCode"
                  >
                    {{ codeCounting ? `${codeCount}s` : "获取验证码" }}
                  </n-button>
                </n-input-group>
              </n-form-item>

              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleEmailLogin"
                class="!rounded-xl shadow-lg shadow-blue-500/20 mt-6"
              >
                登录 / 注册
              </n-button>

              <div class="mt-4 text-center">
                <p class="text-[var(--text-tertiary)] text-xs">
                  未注册的邮箱会自动注册为新账号
                </p>
              </div>
            </n-form>
          </n-tab-pane>

          <n-tab-pane name="register" tab="注册账号">
            <n-form
              ref="registerFormRef"
              :model="registerModel"
              :rules="registerRules"
              size="large"
              class="mt-6"
            >
              <div class="md:grid md:grid-cols-2 md:gap-4">
                <n-form-item path="username" label="用户名">
                  <n-input
                    v-model:value="registerModel.username"
                    placeholder="设置用户名"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:user"
                        class="text-[var(--text-tertiary)] w-5 h-5"
                      />
                    </template>
                  </n-input>
                </n-form-item>
                <n-form-item path="email" label="邮箱">
                  <n-input
                    v-model:value="registerModel.email"
                    placeholder="绑定邮箱"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:envelope"
                        class="text-[var(--text-tertiary)] w-5 h-5"
                      />
                    </template>
                  </n-input>
                </n-form-item>
              </div>

              <n-form-item path="code" label="验证码">
                <n-input-group>
                  <n-input
                    v-model:value="registerModel.code"
                    placeholder="请输入验证码"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:shield-check"
                        class="text-[var(--text-tertiary)]"
                      />
                    </template>
                  </n-input>
                  <n-button
                    ghost
                    :disabled="registerCodeCounting || loading"
                    @click="handleRegisterSendCode"
                  >
                    {{
                      registerCodeCounting
                        ? `${registerCodeCount}s`
                        : "获取验证码"
                    }}
                  </n-button>
                </n-input-group>
              </n-form-item>

              <div class="md:grid md:grid-cols-2 md:gap-4">
                <n-form-item path="password" label="密码">
                  <n-input
                    v-model:value="registerModel.password"
                    type="password"
                    show-password-on="click"
                    placeholder="设置密码"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:lock-closed"
                        class="text-[var(--text-tertiary)]"
                      />
                    </template>
                  </n-input>
                </n-form-item>
                <n-form-item path="confirmPassword" label="确认密码">
                  <n-input
                    v-model:value="registerModel.confirmPassword"
                    type="password"
                    show-password-on="click"
                    placeholder="确认密码"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:lock-closed"
                        class="text-[var(--text-tertiary)]"
                      />
                    </template>
                  </n-input>
                </n-form-item>
              </div>

              <div class="md:grid md:grid-cols-2 md:gap-4">
                <n-form-item path="nickname" label="昵称 (可选)">
                  <n-input
                    v-model:value="registerModel.nickname"
                    placeholder="设置昵称"
                  >
                    <template #prefix>
                      <Icon
                        name="heroicons:face-smile"
                        class="text-[var(--text-tertiary)] w-5 h-5"
                      />
                    </template>
                  </n-input>
                </n-form-item>
                <n-form-item path="gender" label="性别 (可选)">
                  <n-select
                    v-model:value="registerModel.gender"
                    :options="genderOptions"
                    placeholder="选择性别"
                  />
                </n-form-item>
              </div>
              <n-form-item path="agreement">
                <n-checkbox v-model:checked="registerModel.agreement">
                  我已阅读并同意
                  <n-button text type="primary">用户协议</n-button> 和
                  <n-button text type="primary">隐私政策</n-button>
                </n-checkbox>
              </n-form-item>
              <n-button
                type="primary"
                block
                size="large"
                :loading="loading"
                @click="handleRegister"
                class="!rounded-xl shadow-lg shadow-blue-500/20"
              >
                立即注册
              </n-button>
            </n-form>
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>

    <!-- Auto Register Modal -->
    <n-modal
      v-model:show="showAutoRegisterModal"
      preset="card"
      title="完善账号信息"
      class="max-w-md"
      :mask-closable="false"
      :closable="true"
    >
      <n-form
        ref="autoRegisterFormRef"
        :model="autoRegisterModel"
        :rules="autoRegisterRules"
        size="large"
      >
        <n-alert type="info" class="mb-6">
          您的邮箱尚未注册，请设置用户名和密码以完成注册。
        </n-alert>

        <n-form-item path="username" label="用户名">
          <n-input
            v-model:value="autoRegisterModel.username"
            placeholder="设置用户名"
          >
            <template #prefix>
              <Icon
                name="heroicons:user"
                class="text-[var(--text-tertiary)] w-5 h-5"
              />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="password" label="设置密码">
          <n-input
            v-model:value="autoRegisterModel.password"
            type="password"
            show-password-on="click"
            placeholder="设置密码"
          >
            <template #prefix>
              <Icon
                name="heroicons:lock-closed"
                class="text-[var(--text-tertiary)] w-5 h-5"
              />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item path="confirmPassword" label="确认密码">
          <n-input
            v-model:value="autoRegisterModel.confirmPassword"
            type="password"
            show-password-on="click"
            placeholder="确认密码"
          >
            <template #prefix>
              <Icon
                name="heroicons:lock-closed"
                class="text-[var(--text-tertiary)] w-5 h-5"
              />
            </template>
          </n-input>
        </n-form-item>

        <div class="grid grid-cols-2 gap-4">
          <n-form-item path="nickname" label="昵称 (可选)">
            <n-input
              v-model:value="autoRegisterModel.nickname"
              placeholder="设置昵称"
            >
              <template #prefix>
                <Icon
                  name="heroicons:face-smile"
                  class="text-[var(--text-tertiary)] w-5 h-5"
                />
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="gender" label="性别 (可选)">
            <n-select
              v-model:value="autoRegisterModel.gender"
              :options="genderOptions"
              placeholder="选择性别"
            />
          </n-form-item>
        </div>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleAutoRegister"
          class="!rounded-xl shadow-lg shadow-blue-500/20"
        >
          完成注册并登录
        </n-button>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.custom-tabs :deep(.n-tabs-rail) {
  border-radius: 8px !important;
}
.custom-tabs :deep(.n-tabs-tab) {
  border-radius: 6px !important;
}
</style>
