<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">账号管理</h2>
      <div class="flex gap-2 items-center">
        <n-input-group style="width: 300px">
          <n-input
            v-model:value="keyword"
            placeholder="搜索用户名或邮箱"
            @keyup.enter="handleSearch"
          />
          <n-button type="primary" @click="handleSearch">搜索</n-button>
        </n-input-group>
        <n-button
          type="error"
          @click="handleBatchBan"
          :disabled="checkedRowKeys.length === 0"
        >
          批量封禁
        </n-button>
        <n-button
          type="warning"
          @click="handleBatchDelete"
          :disabled="checkedRowKeys.length === 0"
        >
          批量删除
        </n-button>
      </div>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="data"
      :loading="loading"
      :pagination="pagination"
      :row-key="rowKey"
      :checked-row-keys="checkedRowKeys"
      @update:checked-row-keys="updateCheckedRowKeys"
      @update:page="handlePageChange"
    />

    <!-- Assign Role Modal -->
    <n-modal
      v-model:show="showRoleModal"
      preset="card"
      title="分配角色"
      style="width: 500px"
    >
      <n-transfer
        v-model:value="selectedRoleIds"
        :options="roleOptions"
        source-title="可选角色"
        target-title="已选角色"
      />
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showRoleModal = false">取消</n-button>
          <n-button
            type="primary"
            :loading="assignLoading"
            @click="handleAssignRoles"
            >确定</n-button
          >
        </div>
      </template>
    </n-modal>

    <!-- Ban Modal -->
    <n-modal
      v-model:show="showBanModal"
      preset="card"
      title="封禁设置"
      style="width: 520px"
    >
      <div class="space-y-4">
        <n-input
          v-model:value="banReason"
          placeholder="请输入封禁原因（必填）"
        />
        <n-input
          v-model:value="banService"
          placeholder="封禁服务范围（可选）"
        />
        <n-date-picker
          v-model:value="banEndTime"
          type="datetime"
          clearable
          placeholder="封禁结束时间（可选，留空为永久）"
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showBanModal = false">取消</n-button>
          <n-button type="error" :loading="banSubmitting" @click="submitBan"
            >确定封禁</n-button
          >
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, reactive } from "vue";
import { NButton, NTag, NPopconfirm, NDatePicker } from "naive-ui";
import { globalMessage as message } from "~/utils/globalMessage";
import type { DataTableColumns } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";
import dayjs from "dayjs";

// --- 类型定义 ---
interface User {
  id: number;
  username: string;
  email: string;
  status: number;
  createTime: string;
}

interface Role {
  id: number;
  roleName: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  itemCount: number;
}

// --- 响应式状态 ---
definePageMeta({
  layout: "admin-layout",
});

const api = useUserManagementApi();

const loading = ref(false);
const data = ref<User[]>([]);
const keyword = ref("");
const pagination = reactive<Pagination>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
});
const checkedRowKeys = ref<number[]>([]);

// --- 角色分配 ---
const showRoleModal = ref(false);
const assignLoading = ref(false);
const currentUserId = ref<number | null>(null);
const selectedRoleIds = ref<number[]>([]);
const roleOptions = ref<{ label: string; value: number }[]>([]);

// --- 数据获取 ---
const fetchData = async () => {
  loading.value = true;
  try {
    const res = (await api.fetchUsers(
      pagination.page,
      pagination.pageSize,
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
const rowKey = (row: User) => row.id;
const updateCheckedRowKeys = (keys: number[]) => {
  checkedRowKeys.value = keys;
};

// --- 表格列定义 ---
const createColumns = ({
  openRoleModal,
}: {
  openRoleModal: (row: User) => void;
}): DataTableColumns<User> => [
  { type: "selection" },
  { title: "ID", key: "id", width: 80 },
  { title: "用户名", key: "username" },
  { title: "邮箱", key: "email" },
  {
    title: "状态",
    key: "status",
    render(row) {
      return h(
        NTag,
        { type: row.status === 1 ? "success" : "error" },
        { default: () => (row.status === 1 ? "正常" : "禁用") }
      );
    },
  },
  {
    title: "创建时间",
    key: "createTime",
    render(row) {
      return dayjs(row.createTime).isValid()
        ? dayjs(row.createTime).format("YYYY-MM-DD HH:mm:ss")
        : (row.createTime ?? "-");
    },
  },
  {
    title: "操作",
    key: "actions",
    render(row) {
      return h("div", { class: "flex gap-2" }, [
        h(
          NButton,
          {
            size: "small",
            onClick: () => openRoleModal(row),
          },
          { default: () => "分配角色" }
        ),
        h(
          NButton,
          {
            size: "small",
            type: "info",
            onClick: () => navigateTo(`/admin/user/_id/detail?id=${row.id}`),
          },
          { default: () => "详情" }
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleBan(row),
            positiveText: "确定",
            negativeText: "取消",
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: "small",
                  type: "error",
                },
                { default: () => "封禁" }
              ),
            default: () => "确认封禁该用户吗？",
          }
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleResetNickname(row),
            positiveText: "确定",
            negativeText: "取消",
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: "small",
                  type: "warning",
                },
                { default: () => "重置昵称" }
              ),
            default: () => "确认重置该用户的昵称？",
          }
        ),
      ]);
    },
  },
];

const openRoleModal = async (row: User) => {
  currentUserId.value = row.id;
  showRoleModal.value = true;

  // Load all roles and user roles
  const [rolesRes, userRolesRes] = (await Promise.all([
    api.fetchRoles(),
    api.fetchUserRoles(row.id),
  ])) as [any, any];

  if (rolesRes.code === 200) {
    roleOptions.value = rolesRes.data.map((r: Role) => ({
      label: r.roleName,
      value: r.id,
    }));
  }

  if (userRolesRes.code === 200) {
    selectedRoleIds.value = userRolesRes.data.map((r: Role) => r.id);
  }
};

const columns = createColumns({ openRoleModal });

// Ban Modal state
const showBanModal = ref(false);
const banSubmitting = ref(false);
const banReason = ref("");
const banService = ref("");
const banEndTime = ref<number | null>(null);
const banTargetIds = ref<number[]>([]);

const openBanModal = (ids: number[]) => {
  banTargetIds.value = ids;
  banReason.value = "";
  banService.value = "";
  banEndTime.value = null;
  showBanModal.value = true;
};

const submitBan = async () => {
  if (!banReason.value) {
    message.error("请填写封禁原因");
    return;
  }
  banSubmitting.value = true;
  try {
    const payload: any = {
      reason: banReason.value,
    };
    if (banService.value) payload.service = banService.value;
    if (banEndTime.value) payload.endTime = banEndTime.value;
    let res: any;
    if (banTargetIds.value.length === 1) {
      res = await api.banUser(banTargetIds.value[0]!, payload);
    } else {
      res = await api.banUsersBatch(banTargetIds.value, payload);
    }
    if (res.code === 200) {
      message.success("封禁成功");
      showBanModal.value = false;
      checkedRowKeys.value = [];
      fetchData();
    } else {
      message.error(res.tips || "封禁失败");
    }
  } catch {
    message.error("封禁失败");
  } finally {
    banSubmitting.value = false;
  }
};

const handleAssignRoles = async () => {
  if (!currentUserId.value) return;
  assignLoading.value = true;
  try {
    const res = (await api.assignRoles(
      currentUserId.value,
      selectedRoleIds.value
    )) as any;
    if (res.code === 200) {
      message.success("角色分配成功");
      showRoleModal.value = false;
    }
  } finally {
    assignLoading.value = false;
  }
};

const handleBan = async (row: User) => {
  openBanModal([row.id]);
};
const handleResetNickname = async (row: User) => {
  try {
    const res = (await api.resetNickname(row.id)) as any;
    if (res.code === 200) {
      message.success("昵称已重置");
      fetchData();
    }
  } catch {
    message.error("重置失败");
  }
};
const handleBatchBan = async () => {
  if (checkedRowKeys.value.length === 0) return;
  openBanModal(checkedRowKeys.value.slice());
};
const handleBatchDelete = async () => {
  if (checkedRowKeys.value.length === 0) return;
  try {
    const res = (await api.deleteUsersBatch(checkedRowKeys.value)) as any;
    if (res.code === 200) {
      message.success("批量删除完成");
      checkedRowKeys.value = [];
      fetchData();
    }
  } catch {
    message.error("批量删除失败");
  }
};

onMounted(() => {
  fetchData();
});
</script>
