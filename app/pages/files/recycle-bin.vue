<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">回收站</h1>
      <n-button type="default" @click="fetchFiles">
        <template #icon>
          <n-icon><RefreshOutline /></n-icon>
        </template>
        刷新
      </n-button>
    </div>

    <n-spin :show="loading">
      <n-data-table
        :columns="columns"
        :data="files"
        :pagination="pagination"
        :bordered="false"
      />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from "vue";
import {
  NButton,
  NDataTable,
  NSpace,
  NTag,
  NPopconfirm,
  useMessage,
  NIcon,
} from "naive-ui";
import { RefreshOutline, TrashOutline } from "@vicons/ionicons5";
import { useFileApi } from "~/composables/api/useFileApi";
import type { FileMeta } from "~/composables/api/useFileApi";

definePageMeta({
  layout: "admin-layout",
  middleware: ["auth"],
});

const message = useMessage();
const { getRecycleBinFiles, recoverFile, cleanFile } = useFileApi();

const loading = ref(false);
const files = ref<FileMeta[]>([]);

const pagination = {
  pageSize: 10,
};

const columns = [
  {
    title: "文件名",
    key: "originName",
    render(row: FileMeta) {
      return h("div", { class: "flex items-center gap-2" }, [
        h(
          NIcon,
          { size: 20, class: "text-gray-500" },
          {
            default: () => (row.isFolder ? h("span", "📂") : h("span", "📄")),
          }
        ),
        h("span", row.originName),
      ]);
    },
  },
  {
    title: "大小",
    key: "fileSize",
    render(row: FileMeta) {
      if (row.isFolder) return "-";
      return formatSize(row.fileSize);
    },
  },
  {
    title: "删除时间",
    key: "updateTime",
    render(row: FileMeta) {
      return "近期";
    },
  },
  {
    title: "操作",
    key: "actions",
    render(row: FileMeta) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleRecover(row),
                positiveText: "确定",
                negativeText: "取消",
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", type: "primary", ghost: true },
                    { default: () => "还原" }
                  ),
                default: () => "确认还原该文件吗？",
              }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleClean(row),
                positiveText: "确定",
                negativeText: "取消",
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", type: "error", ghost: true },
                    { default: () => "彻底删除" }
                  ),
                default: () => "彻底删除后无法恢复，确认删除？",
              }
            ),
          ],
        }
      );
    },
  },
];

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function fetchFiles() {
  loading.value = true;
  try {
    const res = await getRecycleBinFiles(100);
    if (res.code === 200) {
      files.value = res.data;
    }
  } catch (e) {
    message.error("加载回收站失败");
  } finally {
    loading.value = false;
  }
}

async function handleRecover(row: FileMeta) {
  try {
    const res = await recoverFile(row.uuid);
    if (res.code === 200) {
      message.success("还原成功");
      fetchFiles();
    } else {
      message.error(res.msg || "还原失败");
    }
  } catch (e) {
    message.error("操作失败");
  }
}

async function handleClean(row: FileMeta) {
  try {
    const res = await cleanFile(row.uuid);
    if (res.code === 200) {
      message.success("已彻底删除");
      fetchFiles();
    } else {
      message.error(res.msg || "删除失败");
    }
  } catch (e) {
    message.error("操作失败");
  }
}

onMounted(() => {
  fetchFiles();
});
</script>
