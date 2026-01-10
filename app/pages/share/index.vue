<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
    <n-card class="max-w-md w-full shadow-lg" size="large">
      <div v-if="loading" class="flex flex-col items-center py-8">
        <n-spin size="large" />
        <p class="mt-4 text-gray-500">正在加载分享信息...</p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <n-result status="error" title="访问失败" :description="error">
          <template #footer>
            <n-button @click="router.push('/')">返回首页</n-button>
          </template>
        </n-result>
      </div>

      <div v-else-if="needPwd && !verified" class="py-4">
        <div class="text-center mb-6">
          <n-icon size="48" color="#18a058">
            <LockClosedOutline />
          </n-icon>
          <h2 class="text-xl font-bold mt-2">请输入提取码</h2>
          <p class="text-gray-500 text-sm">该分享文件受到密码保护</p>
        </div>
        <n-input-group>
          <n-input
            v-model:value="password"
            type="password"
            placeholder="请输入提取码"
            show-password-on="click"
            @keydown.enter="handleVerify"
          />
          <n-button type="primary" :loading="verifying" @click="handleVerify">
            提取文件
          </n-button>
        </n-input-group>
      </div>

      <div v-else class="py-4">
        <div class="flex flex-col items-center mb-6">
          <n-icon size="64" :color="fileMeta?.isFolder ? '#f0a020' : '#2080f0'">
             <FolderOpenOutline v-if="fileMeta?.isFolder" />
             <DocumentTextOutline v-else />
          </n-icon>
          <h2 class="text-lg font-bold mt-4 text-center break-all">{{ fileMeta?.originName || shareInfo?.fileName || '未知文件' }}</h2>
          <div class="flex gap-4 mt-2 text-sm text-gray-500">
             <span v-if="fileMeta?.fileSize !== undefined">{{ formatSize(fileMeta.fileSize) }}</span>
             <span v-if="shareInfo?.expireTime">有效期至: {{ formatDate(shareInfo.expireTime) }}</span>
             <span v-else>永久有效</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
            <n-button type="primary" block size="large" @click="handleDownload">
                <template #icon>
                    <n-icon><CloudDownloadOutline /></n-icon>
                </template>
                下载文件
            </n-button>
             <n-button v-if="canPreview" block @click="handlePreview">
                <template #icon>
                    <n-icon><EyeOutline /></n-icon>
                </template>
                在线预览
            </n-button>
        </div>
      </div>
    </n-card>

    <!-- Preview Modal -->
    <n-modal v-model:show="showPreviewModal" :title="fileMeta?.originName" preset="card" style="width: 800px; max-width: 90vw">
        <FilePreview
            v-if="showPreviewModal"
            :url="previewUrl"
            :type="previewType"
            :file-name="fileMeta?.originName || ''"
        />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFileApi, type ShareResult, type FileMeta } from "~/composables/api/useFileApi";
import { NCard, NSpin, NResult, NButton, NInput, NInputGroup, NIcon, useMessage, NModal, NImage } from "naive-ui";
import { LockClosedOutline, DocumentTextOutline, CloudDownloadOutline, FolderOpenOutline, EyeOutline } from "@vicons/ionicons5";
import dayjs from "dayjs";

definePageMeta({
  layout: false,
  auth: false, // Public page
});

const route = useRoute();
const router = useRouter();
const message = useMessage();
const { getShareInfo, getShareFileMeta, getShareDownloadUrl } = useFileApi();

const token = computed(() => route.query.token as string);

const loading = ref(true);
const error = ref("");
const shareInfo = ref<ShareResult | null>(null);
const fileMeta = ref<FileMeta | null>(null);

const needPwd = ref(false);
const verified = ref(false);
const password = ref("");
const verifying = ref(false);

const showPreviewModal = ref(false);
const previewUrl = ref("");
const previewType = ref<"image" | "video" | "audio">("image");

const canPreview = computed(() => {
    if (!fileMeta.value?.mimeType) return false;
    const mime = fileMeta.value.mimeType;
    return mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/");
});

onMounted(async () => {
  if (!token.value) {
    error.value = "无效的分享链接";
    loading.value = false;
    return;
  }
  await fetchShareInfo();
});

const fetchShareInfo = async () => {
  try {
    const { code, data, msg } = await getShareInfo(token.value);
    if (code === 200) {
      shareInfo.value = data;
      if (data.needPwd) {
        needPwd.value = true;
        loading.value = false;
      } else {
        verified.value = true;
        await fetchFileMeta();
      }
    } else {
      error.value = msg || "获取分享信息失败";
      loading.value = false;
    }
  } catch (e) {
    error.value = "网络请求失败";
    loading.value = false;
  }
};

const handleVerify = async () => {
    if (!password.value) return;
    verifying.value = true;
    try {
        await fetchFileMeta(password.value);
        verified.value = true;
    } catch (e: any) {
        message.error(e.message || "提取码错误或网络异常");
    } finally {
        verifying.value = false;
    }
};

const fetchFileMeta = async (pwd?: string) => {
    const { code, data, msg } = await getShareFileMeta(token.value, pwd);
    if (code === 200) {
        fileMeta.value = data;
    } else {
        throw new Error(msg);
    }
    loading.value = false;
};

const handleDownload = () => {
    const url = getShareDownloadUrl(token.value, needPwd.value ? password.value : undefined);
    window.open(url, '_blank');
};

const handlePreview = () => {
    if (!fileMeta.value?.mimeType) return;
    const mime = fileMeta.value.mimeType;
    
    if (mime.startsWith("image/")) previewType.value = "image";
    else if (mime.startsWith("video/")) previewType.value = "video";
    else if (mime.startsWith("audio/")) previewType.value = "audio";
    
    previewUrl.value = getShareDownloadUrl(token.value, needPwd.value ? password.value : undefined, true);
    showPreviewModal.value = true;
};

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateStr: string) {
    return dayjs(dateStr).format("YYYY-MM-DD HH:mm");
}
</script>
