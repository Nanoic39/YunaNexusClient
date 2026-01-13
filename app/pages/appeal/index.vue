<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useAuthApi } from "~/composables/api/useAuthApi";

definePageMeta({
  layout: "admin-layout",
  title: "账号申诉",
});

const message = useMessage();
const router = useRouter();
const { submitAppeal } = useAuthApi();

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

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
</script>

<template>
  <div class="min-h-[calc(100vh-200px)] flex items-center justify-center py-10">
    <div
      class="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl shadow-2xl p-8 border border-[var(--border-color)]"
    >
      <h1 class="text-2xl font-bold mb-4">账号申诉</h1>
      <p class="text-[var(--text-secondary)] mb-6">
        如果您的账号被禁用或注销，可在此提交申诉，我们将尽快处理。
      </p>
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
          <n-button tertiary @click="router.push('/login')">返回登录</n-button>
          <n-button type="primary" :loading="loading" @click="handleSubmit"
            >提交申诉</n-button
          >
        </div>
      </n-form>
    </div>
  </div>
</template>
