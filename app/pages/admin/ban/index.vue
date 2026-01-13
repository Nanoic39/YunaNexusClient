<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">封禁管理</h2>
      <n-input-group style="width: 300px">
        <n-input
          v-model:value="keyword"
          placeholder="搜索用户名或邮箱"
          @keyup.enter="handleSearch"
        />
        <n-button type="primary" @click="handleSearch">搜索</n-button>
      </n-input-group>
    </div>

    <n-data-table
      remote
      :columns="columns"
      :data="data"
      :loading="loading"
      :pagination="pagination"
      @update:page="handlePageChange"
    />
  </div>
  </template>

<script setup lang="ts">
import { h, onMounted, ref, reactive } from "vue";
import { NButton, NTag, useMessage } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";
import dayjs from "dayjs";

definePageMeta({
  layout: "admin-layout",
});

interface User {
  id: number;
  username: string;
  email: string;
  status: number;
  createTime: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  itemCount: number;
}

const message = useMessage();
const api = useUserManagementApi();

const loading = ref(false);
const data = ref<User[]>([]);
const keyword = ref("");
const pagination = reactive<Pagination>({
  page: 1,
  pageSize: 10,
  itemCount: 0,
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = (await api.fetchBannedUsers(
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

const handleUnban = async (row: User) => {
  try {
    const res = (await api.unbanUser(row.id)) as any;
    if (res.code === 200) {
      message.success("解封成功");
      fetchData();
    }
  } catch (e) {
    message.error("解封失败");
  }
};

const createColumns = (): DataTableColumns<User> => [
  { title: "ID", key: "id", width: 80 },
  { title: "用户名", key: "username" },
  { title: "邮箱", key: "email" },
  {
    title: "状态",
    key: "status",
    render(row) {
      return h(NTag, { type: "error" }, { default: () => "封禁" });
    },
  },
  {
    title: "创建时间",
    key: "createTime",
    render(row) {
      return dayjs(row.createTime).isValid()
        ? dayjs(row.createTime).format("YYYY-MM-DD HH:mm:ss")
        : row.createTime ?? "-";
    },
  },
  {
    title: "操作",
    key: "actions",
    render(row) {
      return h(
        NButton,
        {
          size: "small",
          type: "success",
          onClick: () => handleUnban(row),
        },
        { default: () => "解封" }
      );
    },
  },
];

const columns = createColumns();

onMounted(() => {
  fetchData();
});
</script>
