<script setup lang="ts">
import { h, onMounted, ref, reactive } from "vue";
import {
  NButton,
  NPopconfirm,
  useMessage,
  NTag,
  NInput,
  NModal,
  NSelect,
} from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";

definePageMeta({
  layout: "admin-layout",
});

interface Appeal {
  id: number;
  userId: number | null;
  contact: string;
  reason: string;
  status: number;
  operatorId: number | null;
  processRemark: string | null;
  createTime: string;
  updateTime: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  itemCount: number;
}

const message = useMessage();
const api = useUserManagementApi();

const loading = ref(false);
const data = ref<Appeal[]>([]);
const keyword = ref("");
const statusFilter = ref<number | null>(0);
const statusOptions = [
  { label: "待处理", value: 0 },
  { label: "处理中", value: 1 },
  { label: "已通过", value: 2 },
  { label: "已驳回", value: 3 },
];
const pagination = reactive<Pagination>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
});

const remarkModal = ref(false);
const remarkText = ref("");
const currentAppealId = ref<number | null>(null);
const currentAction = ref<"approve" | "reject" | null>(null);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = (await api.fetchAppeals(
      pagination.page,
      pagination.pageSize,
      statusFilter.value ?? undefined,
      keyword.value
    )) as any;
    if (res.code === 200) {
      data.value = res.data.records;
      pagination.itemCount = res.data.total;
    }
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.page = 1;
  fetchData();
};

const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchData();
};

const handleClaim = async (row: Appeal) => {
  try {
    const res = (await api.claimAppeal(row.id)) as any;
    if (res.code === 200) {
      message.success("锁定成功");
      statusFilter.value = 1;
      fetchData();
    } else {
      message.error(res.tips || "锁定失败");
    }
  } catch (e: any) {
    message.error(e?.message || "锁定失败");
  }
};

const handleRelease = async (row: Appeal) => {
  try {
    const res = (await api.releaseAppeal(row.id)) as any;
    if (res.code === 200) {
      message.success("释放成功");
      fetchData();
    } else {
      message.error(res.tips || "释放失败");
    }
  } catch (e: any) {
    message.error(e?.message || "释放失败");
  }
};

const openRemarkModal = (row: Appeal, action: "approve" | "reject") => {
  currentAppealId.value = row.id;
  currentAction.value = action;
  remarkText.value = "";
  remarkModal.value = true;
};

const submitRemark = async () => {
  if (!currentAppealId.value || !currentAction.value) return;
  try {
    const apiCall =
      currentAction.value === "approve"
        ? api.approveAppeal(currentAppealId.value, remarkText.value)
        : api.rejectAppeal(currentAppealId.value, remarkText.value);
    const res = (await apiCall) as any;
    if (res.code === 200) {
      message.success(
        currentAction.value === "approve" ? "已通过申诉并解封" : "已驳回申诉"
      );
      remarkModal.value = false;
      fetchData();
    } else {
      message.error(res.tips || "操作失败");
    }
  } catch (e: any) {
    message.error(e?.message || "操作失败");
  }
};

const statusTag = (status: number) => {
  switch (status) {
    case 0:
      return h(NTag, { type: "warning" }, { default: () => "待处理" });
    case 1:
      return h(NTag, { type: "info" }, { default: () => "处理中" });
    case 2:
      return h(NTag, { type: "success" }, { default: () => "已通过" });
    case 3:
      return h(NTag, { type: "error" }, { default: () => "已驳回" });
    default:
      return h(NTag, { type: "default" }, { default: () => "未知" });
  }
};

const createColumns = (): DataTableColumns<Appeal> => [
  { title: "ID", key: "id", width: 80 },
  { title: "用户ID", key: "userId", width: 100 },
  { title: "联系方式", key: "contact" },
  { title: "申诉原因", key: "reason" },
  {
    title: "状态",
    key: "status",
    render(row) {
      return statusTag(row.status);
    },
  },
  { title: "处理人ID", key: "operatorId", width: 100 },
  { title: "备注", key: "processRemark" },
  {
    title: "操作",
    key: "actions",
    render(row) {
      const buttons: any[] = [];
      if (row.status === 0) {
        buttons.push(
          h(
            NButton,
            { size: "small", type: "info", onClick: () => handleClaim(row) },
            { default: () => "锁定处理" }
          )
        );
      }
      if (row.status === 1) {
        buttons.push(
          h(
            NButton,
            {
              size: "small",
              type: "success",
              onClick: () => openRemarkModal(row, "approve"),
            },
            { default: () => "通过并解封" }
          ),
          h(
            NButton,
            {
              size: "small",
              type: "error",
              onClick: () => openRemarkModal(row, "reject"),
            },
            { default: () => "驳回" }
          ),
          h(
            NButton,
            {
              size: "small",
              type: "warning",
              onClick: () => handleRelease(row),
            },
            { default: () => "释放锁" }
          )
        );
      }
      return h("div", { class: "flex gap-2" }, buttons);
    },
  },
];

const columns = createColumns();

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">申诉处理</h2>
      <div class="flex gap-2 items-center">
        <n-input
          v-model:value="keyword"
          placeholder="搜索联系方式/原因"
          style="width: 260px"
        />
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          placeholder="筛选状态"
          style="width: 220px"
          clearable
        />
        <n-button type="primary" @click="handleSearch">搜索</n-button>
      </div>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="data"
      :loading="loading"
      :pagination="pagination"
      @update:page="handlePageChange"
    />

    <n-modal v-model:show="remarkModal" preset="dialog" title="填写备注">
      <n-input
        v-model:value="remarkText"
        type="textarea"
        rows="4"
        placeholder="请输入处理备注"
      />
      <template #action>
        <div class="flex justify-end gap-2">
          <n-button @click="remarkModal = false">取消</n-button>
          <n-button type="primary" @click="submitRemark">确定</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>
