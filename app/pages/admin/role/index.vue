<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">角色管理</h2>
      <n-button type="primary" @click="openModal()">新增角色</n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="data"
      :loading="loading"
    />

    <!-- Create/Edit Role Modal -->
    <n-modal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 500px">
      <n-form ref="formRef" :model="formModel" :rules="rules">
        <n-form-item label="角色名称" path="roleName">
          <n-input v-model:value="formModel.roleName" placeholder="请输入角色名称" />
        </n-form-item>
        <n-form-item label="角色编码" path="roleCode">
          <n-input v-model:value="formModel.roleCode" placeholder="请输入角色编码" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="formModel.description" type="textarea" placeholder="请输入描述" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</n-button>
        </div>
      </template>
    </n-modal>

    <!-- Assign Permissions Modal -->
    <n-modal v-model:show="showPermModal" preset="card" title="分配权限" style="width: 600px">
      <n-spin :show="permLoading">
        <n-tree
          block-line
          cascade
          checkable
          :data="permissionTree"
          :checked-keys="checkedPermissionKeys"
          :expanded-keys="expandedKeys"
          key-field="id"
          label-field="permName"
          children-field="children"
          @update:checked-keys="handleCheck"
          @update:expanded-keys="(keys: number[]) => expandedKeys = keys"
        />
      </n-spin>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showPermModal = false">取消</n-button>
          <n-button type="primary" :loading="assignPermLoading" @click="handleAssignPermissions">确定</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, reactive } from "vue";
import { NButton, NPopconfirm, useMessage } from "naive-ui";
import type { DataTableColumns, FormInst, FormRules } from "naive-ui";
import { useUserManagementApi } from "~/composables/api/useUserManagementApi";

// --- 类型定义 ---
interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  description: string;
  createTime: string;
}

interface Permission {
  id: number;
  name: string;
  children?: Permission[];
}

interface FormModel {
  id?: number;
  roleName: string;
  roleCode: string;
  description: string;
}

// --- 响应式状态 ---
definePageMeta({
  layout: "admin-layout",
});

const message = useMessage();
const api = useUserManagementApi();

const loading = ref(false);
const data = ref<Role[]>([]);
const showModal = ref(false);
const modalTitle = ref("新增角色");
const submitLoading = ref(false);
const formRef = ref<FormInst | null>(null);

const formModel = reactive<FormModel>({
  id: undefined,
  roleName: "",
  roleCode: "",
  description: "",
});

const rules: FormRules = {
  roleName: { required: true, message: "请输入角色名称", trigger: "blur" },
  roleCode: { required: true, message: "请输入角色编码", trigger: "blur" },
};

// --- 表格列定义 ---
const createColumns = ({ openModal, openPermModal, handleDelete }: {
  openModal: (row: Role) => void;
  openPermModal: (row: Role) => void;
  handleDelete: (id: number) => void;
}): DataTableColumns<Role> => [
  { title: "ID", key: "id", width: 80 },
  { title: "角色名称", key: "roleName" },
  { title: "角色编码", key: "roleCode" },
  { title: "描述", key: "description" },
  { title: "创建时间", key: "createTime" },
  {
    title: "操作",
    key: "actions",
    render(row) {
      return h("div", { class: "flex gap-2" }, [
        h(
          NButton,
          {
            size: "small",
            disabled: row.roleCode === 'super_admin',
            onClick: () => openModal(row),
          },
          { default: () => "编辑" }
        ),
        h(
          NButton,
          {
            size: "small",
            type: "info",
            disabled: row.roleCode === 'super_admin',
            onClick: () => openPermModal(row),
          },
          { default: () => "权限" }
        ),
        h(
          NPopconfirm,
          {
            onPositiveClick: () => row.roleCode === 'super_admin' ? null : handleDelete(row.id),
            positiveText: "确定",
            negativeText: "取消",
          },
          {
            trigger: () => h(NButton, { size: "small", type: "error", disabled: row.roleCode === 'super_admin' }, { default: () => "删除" }),
            default: () => "确认删除该角色吗？",
          }
        ),
      ]);
    },
  },
];

// --- 数据获取 ---
const fetchData = async () => {
  loading.value = true;
  try {
    const res = (await api.fetchRoles()) as any;
    if (res.code === 200) {
      data.value = res.data;
    }
  } finally {
    loading.value = false;
  }
};

// --- 角色操作 ---
const openModal = (row?: Role) => {
  if (row) {
    modalTitle.value = "编辑角色";
    formModel.id = row.id;
    formModel.roleName = row.roleName;
    formModel.roleCode = row.roleCode;
    formModel.description = row.description;
  } else {
    modalTitle.value = "新增角色";
    formModel.id = undefined;
    formModel.roleName = "";
    formModel.roleCode = "";
    formModel.description = "";
  }
  showModal.value = true;
};

const handleSubmit = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      submitLoading.value = true;
      try {
        const payload = { ...formModel };
        if (formModel.id) {
          await api.updateRole(formModel.id, payload);
          message.success("修改成功");
        } else {
          await api.createRole(payload);
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

const handleDelete = async (id: number) => {
  try {
    await api.deleteRole(id);
    message.success("删除成功");
    fetchData();
  } catch (error) {
    message.error("删除失败");
  }
};

// --- 权限分配 ---
const showPermModal = ref(false);
const permLoading = ref(false);
const assignPermLoading = ref(false);
const permissionTree = ref<Permission[]>([]);
const checkedPermissionKeys = ref<number[]>([]);
const currentRoleId = ref<number | null>(null);
let expandedKeys = ref<number[]>([]);

const openPermModal = async (row: Role) => {
  currentRoleId.value = row.id;
  showPermModal.value = true;
  permLoading.value = true;
  
  try {
    const [treeRes, rolePermsRes] = (await Promise.all([
      api.fetchPermissionTree(),
      api.fetchRolePermissions(row.id)
    ])) as [any, any];

    if (treeRes.code === 200) {
      permissionTree.value = treeRes.data;
      // 默认展开“全部权限”子层级
      const findByCode = (nodes: any[], code: string): any | null => {
        for (const n of nodes) {
          if (n.permCode === code) return n;
          if (n.children) {
            const r = findByCode(n.children, code);
            if (r) return r;
          }
        }
        return null;
      };
      const root = findByCode(permissionTree.value as any[], "*:*:*");
      if (root) {
        const childIds: number[] = [];
        const collect = (ns: any[]) => {
          ns.forEach((c) => {
            childIds.push(c.id);
          });
        };
        if (root.children && root.children.length) {
          collect(root.children);
        }
        expandedKeys.value = [root.id, ...childIds];
      } else {
        expandedKeys.value = [];
      }
    }
    if (rolePermsRes.code === 200) {
      checkedPermissionKeys.value = rolePermsRes.data;
    }
  } finally {
    permLoading.value = false;
  }
};

const handleCheck = (keys: number[]) => {
  checkedPermissionKeys.value = keys;
};

const handleAssignPermissions = async () => {
  if (!currentRoleId.value) return;
  assignPermLoading.value = true;
  try {
    await api.assignPermissions(currentRoleId.value, checkedPermissionKeys.value);
    message.success("权限分配成功");
    showPermModal.value = false;
  } finally {
    assignPermLoading.value = false;
  }
};

const columns = createColumns({ openModal, openPermModal, handleDelete });

onMounted(() => {
  fetchData();
});
</script>
