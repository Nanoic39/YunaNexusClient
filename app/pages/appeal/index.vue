<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useMessage, NModal, NTag, NButton } from "naive-ui";
import { useAuthApi } from "~/composables/api/useAuthApi";
import { useProfileApi } from "~/composables/api/useProfileApi";

definePageMeta({
  layout: "admin-layout",
  title: "账号申诉",
});

const message = useMessage();
const router = useRouter();
const { submitAppeal, queryAppeals } = useAuthApi();
const { getUserProfile } = useProfileApi();

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const activeTab = ref<"submit" | "query">("submit");
const queryContact = ref("");
const queryAccount = ref("");
const queryLoading = ref(false);
const queryResults = ref<any[]>([]);
const showUserModal = ref(false);
const userDetail = ref<any | null>(null);

const formRef = ref();
const model = ref({
  contact: "",
  reason: "",
});

const rules = {
  contact: {
    required: true,
    message: "请输入联系方式（邮箱或手机）",
    trigger: "blur",
  },
  reason: { required: true, message: "请填写申诉原因", trigger: "blur" },
};

async function handleSubmit() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    await formRef.value?.validate();
    const res = await submitAppeal({
      contact: model.value.contact,
      reason: model.value.reason,
    });
    if (res.code === 200) {
      successMessage.value = res.tips || "申诉提交成功";
      message.success(successMessage.value);
      model.value.reason = "";
    } else {
      throw new Error(res.tips || "提交失败");
    }
  } catch (e: any) {
    errorMessage.value = e?.message || e?.tips || "提交失败";
    message.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function mapStatus(s: number) {
  switch (s) {
    case 0:
      return "待处理";
    case 1:
      return "处理中";
    case 2:
      return "已通过";
    case 3:
      return "已驳回";
    default:
      return "未知";
  }
}

async function handleQuery() {
  queryLoading.value = true;
  try {
    const res = await queryAppeals({
      contact: queryContact.value || undefined,
      account: queryAccount.value || undefined,
    });
    if (res.code === 200) {
      queryResults.value = (res.data || []).map((r: any) => ({
        ...r,
        statusText: mapStatus(r.status),
      }));
      if (!res.data || res.data.length === 0) {
        message.info("未查询到相关申诉记录");
      }
    } else {
      message.error(res.tips || "查询失败");
    }
  } finally {
    queryLoading.value = false;
  }
}

async function openUserModal(uuid?: string, userExist?: boolean) {
  if (!uuid || !userExist) {
    userDetail.value = null;
    showUserModal.value = true;
    return;
  }
  try {
    const res = await getUserProfile(uuid);
    if (res.code === 200) {
      userDetail.value = res.data;
    } else {
      userDetail.value = null;
    }
  } catch {
    userDetail.value = null;
  } finally {
    showUserModal.value = true;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-200px)] flex items-center justify-center py-10">
    <div
      class="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl shadow-2xl p-8 border border-[var(--border-color)]"
    >
      <h1 class="text-2xl font-bold mb-4">账号申诉</h1>
      <p class="text-[var(--text-secondary)] mb-6">
        如果您的账号被禁用或注销，可在此提交申诉或查询处理结果。
      </p>
      <n-tabs v-model:value="activeTab" type="line" class="mb-4">
        <n-tab-pane name="submit" tab="提交申诉">
          <n-collapse-transition :show="!!errorMessage">
            <n-alert
              title="出错了"
              type="error"
              closable
              class="mb-4"
              @close="errorMessage = ''"
            >
              {{ errorMessage }}
            </n-alert>
          </n-collapse-transition>
          <n-collapse-transition :show="!!successMessage">
            <n-alert
              title="已提交"
              type="success"
              closable
              class="mb-4"
              @close="successMessage = ''"
            >
              {{ successMessage }}
            </n-alert>
          </n-collapse-transition>
          <n-form ref="formRef" :model="model" :rules="rules" size="large">
            <n-form-item path="contact" label="联系方式">
              <n-input
                v-model:value="model.contact"
                placeholder="请输入邮箱或手机"
              />
            </n-form-item>
            <n-form-item path="reason" label="申诉原因">
              <n-input
                v-model:value="model.reason"
                type="textarea"
                placeholder="请详细描述情况"
                :rows="5"
              />
            </n-form-item>
            <div class="flex justify-end gap-2">
              <n-button tertiary @click="router.push('/login')"
                >返回登录</n-button
              >
              <n-button
                type="primary"
                :loading="loading"
                @click="handleSubmit"
                class="min-w-28"
                >提交申诉</n-button
              >
            </div>
          </n-form>
        </n-tab-pane>
        <n-tab-pane name="query" tab="查询申诉结果">
          <div class="border rounded-lg p-4">
            <div class="grid grid-cols-1 gap-3 mb-3">
              <n-input
                v-model:value="queryContact"
                placeholder="输入申诉时填写的联系方式"
              />
              <n-input
                v-model:value="queryAccount"
                placeholder="输入账号（用户名或邮箱，可选）"
              />
            </div>
            <n-button
              type="primary"
              block
              :loading="queryLoading"
              @click="handleQuery"
              >查询申诉记录</n-button
            >
            <div class="mt-4">
              <n-data-table
                :columns="[
                  { title: '联系方式', key: 'contact' },
                  { title: '原因', key: 'reason' },
                  {
                    title: 'UUID',
                    key: 'uuid',
                    render(row: {
                      userExist: boolean | undefined;
                      uuid: string | undefined;
                    }) {
                      if (!row.userExist) {
                        return h(
                          NTag,
                          { type: 'error' },
                          { default: () => '用户不存在' }
                        );
                      }
                      return h(
                        NButton,
                        {
                          text: true,
                          type: 'primary',
                          onClick: () => openUserModal(row.uuid, row.userExist),
                        },
                        { default: () => row.uuid || '-' }
                      );
                    },
                  },
                  { title: '状态', key: 'statusText' },
                  { title: '处理备注', key: 'processRemark' },
                  { title: '创建时间', key: 'createTime' },
                  { title: '更新时间', key: 'updateTime' },
                ]"
                :data="queryResults"
              />
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
      <n-modal
        v-model:show="showUserModal"
        preset="card"
        title="用户信息"
        style="width: 520px"
      >
        <div v-if="userDetail">
          <div class="mb-2">UUID：{{ userDetail.uuid }}</div>
          <div class="mb-2">用户名：{{ userDetail.username }}</div>
          <div class="mb-2">邮箱：{{ userDetail.email || "-" }}</div>
          <div class="mb-2">
            昵称：{{ userDetail.userInfo?.nickname || "-" }}
          </div>
          <div class="mb-2">
            性别：{{
              userDetail.userInfo?.gender === 1
                ? "男"
                : userDetail.userInfo?.gender === 2
                  ? "女"
                  : "保密"
            }}
          </div>
          <div class="mb-2">
            经验：{{ userDetail.userInfo?.experience ?? 0 }}
          </div>
        </div>
        <div v-else class="text-[var(--text-secondary)]">
          <n-tag type="error">用户不存在</n-tag>
        </div>
      </n-modal>
    </div>
  </div>
</template>
