<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="text-lg font-bold">我分享的文件</div>
      <n-button @click="refresh">刷新</n-button>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="shares"
      :loading="loading"
      :pagination="false"
      :row-key="(row) => row.shareToken"
      class="flex-1"
    />
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from "vue";
import { NButton, NDataTable, NSpace, NTag, useMessage, type DataTableColumns } from "naive-ui";
import { useFileApi, type ShareResult } from "~/composables/api/useFileApi";
import dayjs from "dayjs";
import { API_PREFIX } from "~/composables/api/constants";

definePageMeta({
  layout: "admin-layout",
  middleware: ["auth"],
});

const { getMyShares, cancelShare, constructShareLink, updateShareStatus, deleteShare } = useFileApi();
const message = useMessage();

const loading = ref(false);
const shares = ref<ShareResult[]>([]);

const columns: DataTableColumns<ShareResult> = [
  {
    title: "文件名",
    key: "fileName",
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: "提取码",
    key: "needPwd",
    width: 100,
    render(row) {
      return row.needPwd ? "有" : "无";
    },
  },
  {
      title: "下载限制",
      key: "downloadLimit",
      width: 150,
      render(row) {
          return row.downloadLimit > 0 ? `${row.downloadCount} / ${row.downloadLimit}` : `无限制 (${row.downloadCount})`;
      }
  },
  {
    title: "过期时间",
    key: "expireTime",
    width: 180,
    render(row) {
      return row.expireTime ? dayjs(row.expireTime).format("YYYY-MM-DD HH:mm") : "永久有效";
    },
  },
  {
      title: "状态",
      key: "status",
      width: 100,
      render(row) {
          if (row.expireTime && dayjs(row.expireTime).isBefore(dayjs())) {
              return h(NTag, { type: "error", size: "small" }, { default: () => "已过期" });
          }
          const map: Record<number, { text: string; type: string }> = { 
              0: { text: "有效", type: "success" }, 
              1: { text: "暂停", type: "warning" }, 
              2: { text: "无效", type: "error" } 
          };
          const s = map[row.status ?? 0] || map[2];
          return h(NTag, { type: (s?.type || 'error') as any, size: "small" }, { default: () => s?.text || '无效' });
      }
  },
  {
    title: "链接",
    key: "link",
    width: 120,
    render(row) {
        return h(
            NButton,
            {
                size: "small",
                secondary: true,
                onClick: () => {
                    const url = constructShareLink(row.shareToken);
                    navigator.clipboard.writeText(url);
                    message.success("链接已复制");
                }
            },
            { default: () => "复制链接" }
        );
    }
  },
  {
    title: "操作",
    key: "actions",
    width: 180,
    render(row) {
      return h(NSpace, {}, {
        default: () => [
          (row.status === 0 || row.status === undefined) ? h(NButton, { size: "small", type: "warning", secondary: true, onClick: () => handleStatus(row, 1) }, { default: () => "暂停" }) : null,
          row.status === 1 ? h(NButton, { size: "small", type: "success", secondary: true, onClick: () => handleStatus(row, 0) }, { default: () => "恢复" }) : null,
          (row.status === 0 || row.status === 1 || row.status === undefined) ? h(
            NButton,
            {
              size: "small",
              type: "error",
              secondary: true,
              onClick: () => handleStatus(row, 2),
            },
            { default: () => "取消" }
          ) : null,
          (row.status === 2 || (row.expireTime && dayjs(row.expireTime).isBefore(dayjs()))) ? h(
            NButton,
            {
              size: "small",
              type: "error",
              onClick: () => handleDelete(row),
            },
            { default: () => "删除" }
          ) : null
        ]
      });
    },
  },
];

const refresh = async () => {
  loading.value = true;
  const { code, data, msg } = await getMyShares();
  if (code === 200) {
    shares.value = data;
  } else {
    message.error(msg);
  }
  loading.value = false;
};

const handleStatus = async (row: ShareResult, status: number) => {
    const { code, msg } = await updateShareStatus(row.shareToken, status);
    if (code === 200) {
        message.success("操作成功");
        refresh();
    } else {
        message.error(msg);
    }
};

const handleDelete = async (row: ShareResult) => {
    const { code, msg } = await deleteShare(row.shareToken);
    if (code === 200) {
        message.success("删除成功");
        refresh();
    } else {
        message.error(msg);
    }
};

onMounted(() => {
  refresh();
});
</script>
