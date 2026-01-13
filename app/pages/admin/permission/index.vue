<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">权限管理</h2>
      <n-button type="primary" @click="openModal()">新增权限</n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="data"
      :loading="loading"
      :row-key="(row: PermissionNode) => row.id"
      :expanded-row-keys="expandedRowKeys"
      @update:expanded-row-keys="onUpdateExpandedKeys"
      default-expand-all
    />

    <!-- Create/Edit Permission Modal -->
    <n-modal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 500px">
      <n-form ref="formRef" :model="formModel" :rules="rules">
        <n-form-item label="上级权限" path="parentId">
          <n-tree-select
            v-model:value="formModel.parentId"
            :options="treeOptions"
            key-field="id"
            label-field="permName"
            placeholder="请选择上级权限（留空为顶级）"
            clearable
          />
        </n-form-item>
        <n-form-item label="权限名称" path="permName">
          <n-input v-model:value="formModel.permName" placeholder="请输入权限名称" />
        </n-form-item>
        <n-form-item label="权限标识" path="permCode">
          <n-input v-model:value="formModel.permCode" placeholder="请输入权限标识 (例如 sys:user:list)" />
        </n-form-item>
        <n-form-item label="类型" path="resourceType">
          <n-radio-group v-model:value="formModel.resourceType">
            <n-radio :value="1">菜单</n-radio>
            <n-radio :value="2">按钮</n-radio>
          </n-radio-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, reactive, computed } from "vue";
import { NButton, NPopconfirm, useMessage, NTag } from "naive-ui";
import type { DataTableColumns, FormInst, FormRules } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";

definePageMeta({
  layout: "admin-layout",
});

interface PermissionNode {
  id: number;
  parentId: number;
  permName: string;
  permCode: string;
  resourceType: number;
  children?: PermissionNode[];
}

interface PermissionFormModel {
  id?: number;
  parentId: number | null;
  permName: string;
  permCode: string;
  resourceType: number;
}

const message = useMessage();
const api = useUserManagementApi();

const loading = ref(false);
const data = ref<PermissionNode[]>([]);
const expandedRowKeys = ref<number[]>(
  (() => {
    try {
      const raw = localStorage.getItem("permission_expanded_keys");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })()
);
const showModal = ref(false);
const modalTitle = ref("新增权限");
const submitLoading = ref(false);
const formRef = ref<FormInst | null>(null);

const formModel = reactive<PermissionFormModel>({
  id: undefined,
  parentId: null,
  permName: "",
  permCode: "",
  resourceType: 1,
});

const rules: FormRules = {
  permName: { required: true, message: "请输入权限名称", trigger: "blur" },
  permCode: { required: true, message: "请输入权限标识", trigger: "blur" },
  resourceType: { required: true, message: "请选择类型", trigger: "change", type: "number" },
};

const createColumns = ({ openModal, handleDelete }: { openModal: (row: PermissionNode, isEdit?: boolean, isAddSub?: boolean) => void; handleDelete: (id: number) => void; }): DataTableColumns<PermissionNode> => [
  { title: "权限名称", key: "permName" },
  { title: "权限标识", key: "permCode" },
  {
    title: "类型",
    key: "resourceType",
    render(row) {
      const typeText = row.resourceType === 1 ? "菜单" : (row.resourceType === 2 ? "按钮" : "特殊");
      const tagType = row.resourceType === 1 ? "info" : (row.resourceType === 2 ? "warning" : "success");
      return h(NTag, { type: tagType }, { default: () => typeText });
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
            onClick: () => openModal(row, true),
          },
          { default: () => "编辑" }
        ),
        h(
          NButton,
          {
            size: "small",
            onClick: () => openModal(row, false, true),
          },
          { default: () => "添加下级" }
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => handleDelete(row.id),
            positiveText: "确定",
            negativeText: "取消",
          },
          {
            trigger: () => h(NButton, { size: "small", type: "error" }, { default: () => "删除" }),
            default: () => "确认删除该权限吗？",
          }
        ),
      ]);
    },
  },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const res = (await api.fetchPermissionTree()) as any;
    if (res.code === 200) {
      data.value = res.data;
    }
  } finally {
    loading.value = false;
  }
};

const treeOptions = computed(() => {
  return data.value;
});

function openModal(row?: PermissionNode, isEdit = false, isAddSub = false) {
  if (isEdit && row) {
    modalTitle.value = "编辑权限";
    formModel.id = row.id;
    formModel.parentId = row.parentId === 0 ? null : row.parentId;
    formModel.permName = row.permName;
    formModel.permCode = row.permCode;
    formModel.resourceType = row.resourceType;
  } else if (isAddSub && row) {
    modalTitle.value = "新增下级权限";
    formModel.id = undefined;
    formModel.parentId = row.id;
    formModel.permName = "";
    formModel.permCode = "";
    formModel.resourceType = 2;
  } else {
    modalTitle.value = "新增权限";
    formModel.id = undefined;
    formModel.parentId = null;
    formModel.permName = "";
    formModel.permCode = "";
    formModel.resourceType = 1;
  }
  showModal.value = true;
}

const handleSubmit = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      submitLoading.value = true;
      try {
        const payload = { ...formModel, parentId: formModel.parentId ?? 0 };
        
        if (formModel.id) {
          await api.updatePermission(formModel.id, payload);
          message.success("修改成功");
        } else {
          await api.createPermission(payload);
          message.success("创建成功");
        }
        showModal.value = false;
        fetchData();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

async function handleDelete(id: number) {
  await api.deletePermission(id);
  message.success("删除成功");
  fetchData();
}

const columns = createColumns({ openModal, handleDelete });

onMounted(() => {
  fetchData();
});

function onUpdateExpandedKeys(keys: number[]) {
  expandedRowKeys.value = keys;
  try {
    localStorage.setItem("permission_expanded_keys", JSON.stringify(keys));
  } catch {}
}
</script>
