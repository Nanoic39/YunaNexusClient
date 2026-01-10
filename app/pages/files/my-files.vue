<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-2">
        <n-button
          v-if="breadcrumbs.length > 1"
          circle
          size="small"
          @click="handleUp"
        >
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
        </n-button>
        <n-breadcrumb>
          <n-breadcrumb-item
            v-for="(item, index) in breadcrumbs"
            :key="item.id"
          >
            <span
              class="px-1 py-0.5 rounded transition-colors cursor-pointer"
              :class="{ 'bg-primary/20 text-primary': dragOverId === item.id }"
              @click="handleBreadcrumbClick(index)"
              @dragover="handleBreadcrumbDragOver($event, item.id)"
              @dragleave="handleBreadcrumbDragLeave"
              @drop="handleBreadcrumbDrop($event, item.id)"
            >
              {{ item.name }}
            </span>
          </n-breadcrumb-item>
        </n-breadcrumb>
      </div>
      <n-space>
        <n-button @click="showCreateFolder = true">新建文件夹</n-button>
        <n-button type="primary" @click="showUploadModal = true"
          >上传文件</n-button
        >
      </n-space>
    </div>

    <n-data-table
      :columns="columns"
      :data="files"
      :loading="loading"
      :row-props="rowProps"
    />

    <!-- Upload Modal -->
    <n-modal
      v-model:show="showUploadModal"
      title="上传文件"
      preset="card"
      style="width: 500px"
    >
      <n-upload
        multiple
        directory-dnd
        :custom-request="handleUpload"
        :show-file-list="false"
      >
        <n-upload-dragger>
          <div class="p-8 text-center">
            <n-p depth="3" class="text-lg">点击或拖拽文件到此处上传</n-p>
            <n-p depth="3" class="mt-2">
              支持任意格式文件，当前支持最大 1TB
            </n-p>
          </div>
        </n-upload-dragger>
      </n-upload>
    </n-modal>

    <!-- Create Folder Modal -->
    <n-modal
      v-model:show="showCreateFolder"
      title="新建文件夹"
      preset="card"
      style="width: 400px"
    >
      <n-input
        v-model:value="folderName"
        placeholder="文件夹名称"
        @keydown.enter="handleCreateFolder"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreateFolder = false">取消</n-button>
          <n-button type="primary" @click="handleCreateFolder">确定</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Rename Modal -->
    <n-modal
      v-model:show="showRenameModal"
      title="重命名"
      preset="card"
      style="width: 400px"
    >
      <n-input v-model:value="renameForm.name" placeholder="请输入新名称" />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showRenameModal = false">取消</n-button>
          <n-button type="primary" :loading="renaming" @click="handleRename"
            >确定</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- Move Modal -->
    <n-modal
      v-model:show="showMoveModal"
      title="移动到"
      preset="card"
      style="width: 400px"
    >
      <n-tree-select
        v-model:value="moveTargetFolderId"
        :options="folderTreeOptions"
        :loading="loadingFolders"
        placeholder="请选择目标文件夹"
        :on-load="handleLoadFolderChildren"
        key-field="key"
        label-field="label"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showMoveModal = false">取消</n-button>
          <n-button type="primary" @click="handleMoveConfirm">确定</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Share Modal -->
    <n-modal
      v-model:show="showShareModal"
      title="分享文件"
      preset="card"
      style="width: 500px"
    >
      <n-form v-if="!shareResult">
        <n-form-item label="有效期（天）">
          <n-input-number
            v-model:value="shareForm.expire"
            placeholder="默认7天，0为永久"
          />
        </n-form-item>
        <n-form-item label="提取码">
          <n-checkbox v-model:checked="shareForm.needPwd"
            >需要提取码</n-checkbox
          >
          <n-input
            v-if="shareForm.needPwd"
            v-model:value="shareForm.pwd"
            placeholder="留空自动生成"
          />
        </n-form-item>
        <n-form-item label="下载限制">
          <n-input-number
            v-model:value="shareForm.downloadLimit"
            placeholder="默认无限制，0为无限制"
            :min="0"
          />
        </n-form-item>
        <n-form-item label="权限设置">
          <n-space>
            <n-checkbox v-model:checked="shareForm.allowDownload"
              >允许下载</n-checkbox
            >
            <n-checkbox v-model:checked="shareForm.allowEdit"
              >允许编辑原始文件</n-checkbox
            >
          </n-space>
        </n-form-item>
      </n-form>
      <div v-else class="text-center">
        <p>分享链接已生成：</p>
        <div class="bg-gray-100 p-2 rounded mt-2 select-all break-all">
          {{ shareResult.url }}
        </div>
        <p v-if="shareResult.pwd" class="mt-2">提取码：{{ shareResult.pwd }}</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showShareModal = false">关闭</n-button>
          <n-button
            v-if="!shareResult"
            type="primary"
            :loading="sharing"
            @click="handleShare"
            >生成链接</n-button
          >
          <n-button v-else type="primary" @click="copyShareLink"
            >复制链接</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- Preview Modal -->
    <n-modal
      v-model:show="showPreview"
      :title="previewTitle"
      preset="card"
      style="width: 800px; max-width: 90vw"
    >
      <FilePreview
        v-if="showPreview"
        :url="previewUrl"
        :type="previewType"
        :file-name="previewTitle"
      />
    </n-modal>

    <!-- Upload Progress -->
    <n-card
      v-if="uploadTasks.length > 0"
      class="fixed bottom-4 right-4 w-96 z-50 shadow-lg"
      size="small"
      title="上传任务"
      closable
      @close="clearCompletedTasks"
    >
      <div class="max-h-60 overflow-y-auto flex flex-col gap-2">
        <div
          v-for="task in uploadTasks"
          :key="task.uuid"
          class="flex flex-col gap-1"
        >
          <div class="flex justify-between items-center text-xs">
            <span class="truncate max-w-[200px]">{{ task.file.name }}</span>
            <span
              :class="{
                'text-primary': task.status === 'uploading',
                'text-warning': task.status === 'merging',
                'text-success': task.status === 'completed',
                'text-error': task.status === 'error',
              }"
            >
              {{ getStatusText(task.status) }}
            </span>
          </div>
          <n-progress
            type="line"
            :percentage="task.progress"
            :status="
              task.status === 'error'
                ? 'error'
                : task.status === 'completed'
                  ? 'success'
                  : 'default'
            "
            processing
            :show-indicator="false"
            :height="4"
          />
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { h, ref, onMounted, computed, watch } from "vue";
import { API_PREFIX } from "~/composables/api/constants";
import { useFileApi, type FileMeta } from "~/composables/api/useFileApi";
import { useHttp } from "~/composables/useHttp"; // Import useHttp for blob fetch
import dayjs from "dayjs";
import {
  NButton,
  NSpace,
  NTag,
  useMessage,
  useDialog,
  type DataTableColumns,
  type UploadCustomRequestOptions,
  NInput,
  NInputNumber,
  NCheckbox,
  NBreadcrumb,
  NBreadcrumbItem,
  NIcon,
  NModal,
  NForm,
  NFormItem,
  NImage,
  NUpload,
  NUploadDragger,
  NP,
  NDataTable,
  NDropdown,
  NTreeSelect,
  NCard,
  NProgress,
} from "naive-ui";
import {
  FolderOpenOutline,
  DocumentOutline,
  ArrowBack,
} from "@vicons/ionicons5";
import {
  useChunkUpload,
  type UploadProgress,
} from "~/composables/useChunkUpload";
import FilePreview from "~/components/FilePreview.vue";

definePageMeta({
  layout: "admin-layout",
  middleware: ["auth"],
});

const {
  getFileList,
  deleteFile,
  uploadFile,
  getDownloadUrl,
  renameFile,
  createShare,
  createFolder,
  moveFile,
  getDownloadToken,
  cancelShare,
  constructShareLink,
} = useFileApi();
const { upload: chunkUpload, uploadTasks } = useChunkUpload();
const message = useMessage();

const getStatusText = (status: string) => {
  switch (status) {
    case "uploading":
      return "上传中";
    case "merging":
      return "合并中";
    case "completed":
      return "已完成";
    case "error":
      return "失败";
    default:
      return status;
  }
};

const clearCompletedTasks = () => {
  if (uploadTasks.value) {
    for (let i = uploadTasks.value.length - 1; i >= 0; i--) {
      if (uploadTasks.value[i]?.status === "completed") {
        uploadTasks.value.splice(i, 1);
      }
    }
  }
};
const dialog = useDialog();

const loading = ref(false);
const files = ref<FileMeta[]>([]);
const showUploadModal = ref(false);

// Move Modal State
const showMoveModal = ref(false);
const moveTargetUuid = ref("");
const moveTargetFolderId = ref<number | null>(null);
const folderTreeOptions = ref<any[]>([]);
const loadingFolders = ref(false);

// Folder State
const breadcrumbs = ref<{ id: number; name: string }[]>([
  { id: 0, name: "全部文件" },
]);
const currentFolderId = computed(
  () => breadcrumbs.value[breadcrumbs.value.length - 1]?.id ?? 0
);
const showCreateFolder = ref(false);
const folderName = ref("");

// Rename State
const showRenameModal = ref(false);
const renameForm = ref({ uuid: "", name: "" });
const renaming = ref(false);

// Share State
const showShareModal = ref(false);
const shareForm = ref({
  uuid: "",
  pwd: "",
  expire: null as number | null,
  needPwd: false,
  downloadLimit: null as number | null,
  allowDownload: true,
  allowEdit: false,
});
const sharing = ref(false);
const shareResult = ref<{ url: string; pwd?: string } | null>(null);

// Preview State
const showPreview = ref(false);
const previewUrl = ref("");
const previewType = ref<"image" | "video" | "audio">("image");
const previewTitle = ref("");

// Drag State
const dragUuid = ref<string | null>(null);
const dragOverId = ref<number | null>(null);

const handleBreadcrumbDragOver = (e: DragEvent, id: number) => {
  if (id === currentFolderId.value) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";
  dragOverId.value = id;
};

const handleBreadcrumbDragLeave = (e: DragEvent) => {
  dragOverId.value = null;
};

const handleBreadcrumbDrop = async (e: DragEvent, id: number) => {
  e.preventDefault();
  dragOverId.value = null;

  if (id === currentFolderId.value) return;

  const uuid = e.dataTransfer!.getData("text/plain");
  if (!uuid) return;

  const { code, msg } = await moveFile(uuid, id === 0 ? undefined : id);
  if (code === 200) {
    message.success("移动成功");
    refresh();
  } else {
    message.error(msg);
  }
};

const columns: DataTableColumns<FileMeta> = [
  {
    title: "文件名",
    key: "originName",
    width: 300,
    render(row) {
      return h(
        "div",
        {
          class: "flex items-center gap-2 cursor-pointer hover:text-primary",
          onClick: () => handleRowClick(row),
        },
        [
          h(NIcon, {
            component: row.isFolder ? FolderOpenOutline : DocumentOutline,
            size: 20,
            class: row.isFolder ? "text-yellow-500" : "text-gray-500",
          }),
          h("span", {}, row.originName),
        ]
      );
    },
  },
  {
    title: "大小",
    key: "fileSize",
    width: 100,
    render(row) {
      return row.isFolder ? "-" : formatSize(row.fileSize);
    },
  },
  {
    title: "类型",
    key: "fileType",
    width: 80,
    render(row) {
      return row.isFolder ? "文件夹" : formatFileType(row);
    },
  },
  {
    title: "修改时间",
    key: "updateTime", // Use updateTime
    width: 180,
    render(row) {
      return dayjs(row.updateTime || row.createTime).format("YYYY-MM-DD HH:mm");
    },
  },
  {
    title: "操作",
    key: "actions",
    width: 240,
    render(row) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            !row.isFolder &&
              h(
                NButton,
                {
                  size: "small",
                  secondary: true,
                  onClick: (e) => {
                    e.stopPropagation();
                    handlePreview(row);
                  },
                },
                { default: () => "预览" }
              ),
            !row.isFolder &&
              h(
                NButton,
                {
                  size: "small",
                  secondary: true,
                  onClick: (e) => {
                    e.stopPropagation();
                    handleDownload(row);
                  },
                },
                { default: () => "下载" }
              ),
            h(
              NButton,
              {
                size: "small",
                secondary: true,
                onClick: (e) => {
                  e.stopPropagation();
                  openRenameModal(row);
                },
              },
              { default: () => "重命名" }
            ),
            h(
              NDropdown,
              {
                trigger: "click",
                options: [
                  ...(!row.isFolder ? [{ label: "分享", key: "share" }] : []),
                  { label: "移动", key: "move" },
                  ...(row.isShared
                    ? [{ label: "取消分享", key: "cancelShare" }]
                    : []),
                ],
                onSelect: (key) => {
                  if (key === "share") openShareModal(row);
                  if (key === "move") openMoveModal(row);
                  if (key === "cancelShare") handleCancelShare(row);
                },
                onClick: (e: MouseEvent) => e.stopPropagation(),
              },
              {
                default: () =>
                  h(
                    NButton,
                    {
                      size: "small",
                      secondary: true,
                      onClick: (e) => e.stopPropagation(),
                    },
                    { default: () => "更多" }
                  ),
              }
            ),
            h(
              NButton,
              {
                size: "small",
                type: "error",
                secondary: true,
                onClick: (e) => {
                  e.stopPropagation();
                  handleDelete(row);
                },
              },
              { default: () => "删除" }
            ),
          ],
        }
      );
    },
  },
];

const rowProps = (row: FileMeta) => {
  return {
    draggable: true,
    onDragstart: (e: DragEvent) => {
      dragUuid.value = row.uuid;
      e.dataTransfer!.setData("text/plain", row.uuid);
      e.dataTransfer!.effectAllowed = "move";
    },
    onDragover: (e: DragEvent) => {
      if (row.isFolder && row.uuid !== dragUuid.value) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
        (e.currentTarget as HTMLElement).style.background =
          "var(--n-color-hover)";
      }
    },
    onDragleave: (e: DragEvent) => {
      (e.currentTarget as HTMLElement).style.background = "";
    },
    onDrop: async (e: DragEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).style.background = "";
      const uuid = e.dataTransfer!.getData("text/plain");
      if (!uuid || uuid === row.uuid) return;
      if (row.isFolder) {
        const { code, msg } = await moveFile(uuid, row.id);
        if (code === 200) {
          message.success("移动成功");
          refresh();
        } else {
          message.error(msg);
        }
      }
    },
  };
};

const refresh = async () => {
  loading.value = true;
  const { data, code, msg } = await getFileList(currentFolderId.value);
  if (code === 200) {
    files.value = data;
  } else {
    message.error(msg);
  }
  loading.value = false;
};

const handleRowClick = (row: FileMeta) => {
  if (row.isFolder) {
    breadcrumbs.value.push({ id: row.id, name: row.originName });
    refresh();
  } else {
    handlePreview(row);
  }
};

const handleBreadcrumbClick = (index: number) => {
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  refresh();
};

const handleUp = () => {
  if (breadcrumbs.value.length > 1) {
    breadcrumbs.value.pop();
    refresh();
  }
};

const handleCreateFolder = async () => {
  if (!folderName.value) return;
  const { code, msg } = await createFolder(
    folderName.value,
    currentFolderId.value === 0 ? undefined : currentFolderId.value
  );
  if (code === 200) {
    message.success("创建成功");
    showCreateFolder.value = false;
    folderName.value = "";
    refresh();
  } else {
    message.error(msg);
  }
};

const handleUpload = async ({ file, onFinish }: UploadCustomRequestOptions) => {
  if (!file.file) return;
  showUploadModal.value = false;
  await chunkUpload(
    file.file,
    currentFolderId.value === 0 ? undefined : currentFolderId.value,
    () => {
      refresh();
    }
  );
  onFinish();
};

const openMoveModal = (row: FileMeta) => {
  moveTargetUuid.value = row.uuid;
  showMoveModal.value = true;
  loadFolderTree();
};

const loadFolderTree = async () => {
  loadingFolders.value = true;
  const { data } = await getFileList(0);
  if (data) {
    folderTreeOptions.value = [
      { label: "根目录", key: 0, isLeaf: false },
      ...data
        .filter((f) => f.isFolder)
        .map((f) => ({
          label: f.originName,
          key: f.id,
          isLeaf: false,
        })),
    ];
  }
  loadingFolders.value = false;
};

const handleLoadFolderChildren = async (option: any) => {
  const { data } = await getFileList(option.key);
  if (data) {
    option.children = data
      .filter((f) => f.isFolder)
      .map((f) => ({
        label: f.originName,
        key: f.id,
        isLeaf: false,
      }));
    if (option.children.length === 0) {
      option.isLeaf = true;
    }
  }
  return Promise.resolve();
};

const handleMoveConfirm = async () => {
  if (moveTargetFolderId.value === null) return;
  const { code, msg } = await moveFile(
    moveTargetUuid.value,
    moveTargetFolderId.value
  );
  if (code === 200) {
    message.success("移动成功");
    showMoveModal.value = false;
    refresh();
  } else {
    message.error(msg);
  }
};

const handleDelete = (row: FileMeta) => {
  dialog.warning({
    title: "确认删除",
    content: `确定要删除“${row.originName}”吗？${row.isFolder ? "文件夹内的所有内容也将被删除（软删除）。" : ""}`,
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: async () => {
      const { code, msg } = await deleteFile(row.uuid);
      if (code === 200) {
        message.success("删除成功");
        refresh();
      } else {
        message.error(msg);
      }
    },
  });
};

const handleDownload = async (row: FileMeta) => {
  try {
    const { code, data: token } = await getDownloadToken(row.uuid);
    if (code === 200 && token) {
      const url = getDownloadUrl(row.uuid, token);
      window.open(url, "_blank");
    } else {
      message.error("获取下载链接失败");
    }
  } catch (e) {
    message.error("下载失败");
  }
};

const handlePreview = async (row: FileMeta) => {
  if (!row.mimeType) {
    message.info("未知文件类型，无法预览");
    return;
  }
  if (row.mimeType.startsWith("image/")) {
    previewType.value = "image";
  } else if (row.mimeType.startsWith("video/")) {
    previewType.value = "video";
  } else if (row.mimeType.startsWith("audio/")) {
    previewType.value = "audio";
  } else {
    message.info("暂不支持预览此类型文件");
    return;
  }

  previewTitle.value = row.originName;
  // For preview, we use blob to ensure auth headers are passed
  // But since we have download token, we can use that for cleaner URL (e.g. for video streaming)
  // However, download token is short lived.
  // Let's use getDownloadToken for preview as well, it's safer.
  const { code, data: token } = await getDownloadToken(row.uuid);
  if (code === 200 && token) {
    previewUrl.value = getDownloadUrl(row.uuid, token, true);
    showPreview.value = true;
  } else {
    message.error("获取预览失败");
  }
};

const openRenameModal = (row: FileMeta) => {
  renameForm.value = { uuid: row.uuid, name: row.originName };
  showRenameModal.value = true;
};

const handleRename = async () => {
  if (!renameForm.value.name) return;
  renaming.value = true;
  const { code, msg } = await renameFile(
    renameForm.value.uuid,
    renameForm.value.name
  );
  if (code === 200) {
    message.success("重命名成功");
    showRenameModal.value = false;
    refresh();
  } else {
    message.error(msg);
  }
  renaming.value = false;
};

const openShareModal = (row: FileMeta) => {
  shareForm.value = {
    uuid: row.uuid,
    pwd: "",
    expire: 7,
    needPwd: false,
    downloadLimit: null,
    allowDownload: true,
    allowEdit: false,
  };
  shareResult.value = null;
  showShareModal.value = true;
};

const handleShare = async () => {
  sharing.value = true;
  const { code, msg, data } = await createShare(
    shareForm.value.uuid,
    shareForm.value.expire || undefined,
    shareForm.value.needPwd ? shareForm.value.pwd || undefined : undefined,
    shareForm.value.downloadLimit || undefined,
    (shareForm.value.allowDownload ? 1 : 0) |
      (shareForm.value.allowEdit ? 2 : 0)
  );
  if (code === 200) {
    message.success("创建分享成功");
    shareResult.value = {
      url: constructShareLink(data.shareToken),
      pwd: data.needPwd ? "******" : undefined,
    };
  } else {
    message.error(msg);
  }
  sharing.value = false;
};

const copyShareLink = () => {
  if (shareResult.value) {
    navigator.clipboard.writeText(
      `链接: ${shareResult.value.url} ${shareResult.value.pwd ? "提取码: " + shareResult.value.pwd : ""}`
    );
    message.success("复制成功");
  }
};

const handleCancelShare = async (row: FileMeta) => {
  const { code, msg } = await cancelShare(row.uuid);
  if (code === 200) {
    message.success("取消分享成功");
    refresh();
  } else {
    message.error(msg);
  }
};

function formatSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatFileType(row: FileMeta) {
  if (row.fileType) return row.fileType.toUpperCase();
  if (row.mimeType) {
    if (row.mimeType.startsWith("image/")) return "图片";
    if (row.mimeType.startsWith("video/")) return "视频";
    if (row.mimeType.startsWith("audio/")) return "音频";
    if (row.mimeType.includes("pdf")) return "PDF";
    if (row.mimeType.includes("text")) return "文本";
    return "文件";
  }
  return "未知";
}

onMounted(() => {
  refresh();
});
</script>
