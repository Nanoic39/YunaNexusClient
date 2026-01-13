import { useHttp } from "~/composables/useHttp";
import { API_PREFIX } from "./constants";

export const useUserManagementApi = () => {
  // User Management
  const fetchUsers = (page: number, size: number, keyword?: string) => {
    return useHttp(`${API_PREFIX.USER}/user/list`, {
      method: "GET",
      params: { page, size, keyword },
    });
  };

  const assignRoles = (userId: number, roleIds: number[]) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}/roles`, {
      method: "POST",
      body: roleIds,
    });
  };

  const fetchUserRoles = (userId: number) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}/roles`, {
      method: "GET",
    });
  };

  const fetchUserDetail = (userId: number) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}`, {
      method: "GET",
    });
  };

  const banUser = (userId: number) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}/ban`, {
      method: "POST",
    });
  };

  const unbanUser = (userId: number) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}/unban`, {
      method: "POST",
    });
  };

  const banUsersBatch = (ids: number[]) => {
    return useHttp(`${API_PREFIX.USER}/user/ban/batch`, {
      method: "POST",
      body: ids,
    });
  };

  const unbanUsersBatch = (ids: number[]) => {
    return useHttp(`${API_PREFIX.USER}/user/unban/batch`, {
      method: "POST",
      body: ids,
    });
  };

  const deleteUsersBatch = (ids: number[]) => {
    return useHttp(`${API_PREFIX.USER}/user/batch`, {
      method: "DELETE",
      body: ids,
    });
  };

  const resetUsername = (userId: number) => {
    return useHttp(`${API_PREFIX.USER}/user/${userId}/username/reset`, {
      method: "POST",
    });
  };

  const fetchBannedUsers = (page: number, size: number, keyword?: string) => {
    return useHttp(`${API_PREFIX.USER}/user/ban/list`, {
      method: "GET",
      params: { page, size, keyword },
    });
  };

  // Role Management
  const fetchRoles = () => {
    return useHttp(`${API_PREFIX.USER}/role/list`, {
      method: "GET",
    });
  };

  const createRole = (data: any) => {
    return useHttp(`${API_PREFIX.USER}/role`, {
      method: "POST",
      body: data,
    });
  };

  const updateRole = (id: number, data: any) => {
    return useHttp(`${API_PREFIX.USER}/role/${id}`, {
      method: "PUT",
      body: data,
    });
  };

  const deleteRole = (id: number) => {
    return useHttp(`${API_PREFIX.USER}/role/${id}`, {
      method: "DELETE",
    });
  };

  const assignPermissions = (roleId: number, permissionIds: number[]) => {
    return useHttp(`${API_PREFIX.USER}/role/${roleId}/permissions`, {
      method: "POST",
      body: permissionIds,
    });
  };

  const fetchRolePermissions = (roleId: number) => {
    return useHttp(`${API_PREFIX.USER}/role/${roleId}/permissions`, {
      method: "GET",
    });
  };

  // Permission Management
  const fetchPermissionTree = () => {
    return useHttp(`${API_PREFIX.USER}/permission/tree`, {
      method: "GET",
    });
  };

  const createPermission = (data: any) => {
    return useHttp(`${API_PREFIX.USER}/permission`, {
      method: "POST",
      body: data,
    });
  };

  const updatePermission = (id: number, data: any) => {
    return useHttp(`${API_PREFIX.USER}/permission/${id}`, {
      method: "PUT",
      body: data,
    });
  };

  const deletePermission = (id: number) => {
    return useHttp(`${API_PREFIX.USER}/permission/${id}`, {
      method: "DELETE",
    });
  };

  const fetchCurrentUserPermissions = () => {
    return useHttp(`${API_PREFIX.USER}/user/permissions`, {
      method: "GET",
    });
  };

  const fetchAppeals = (
    page: number,
    size: number,
    status?: number,
    keyword?: string
  ) => {
    return useHttp(`${API_PREFIX.USER}/appeal/admin/list`, {
      method: "GET",
      params: { page, size, status, keyword },
    });
  };
  const claimAppeal = (id: number) => {
    return useHttp(`${API_PREFIX.USER}/appeal/admin/${id}/claim`, {
      method: "POST",
    });
  };
  const releaseAppeal = (id: number) => {
    return useHttp(`${API_PREFIX.USER}/appeal/admin/${id}/release`, {
      method: "POST",
    });
  };
  const approveAppeal = (id: number, remark: string) => {
    return useHttp(`${API_PREFIX.USER}/appeal/admin/${id}/approve`, {
      method: "POST",
      body: remark,
    });
  };
  const rejectAppeal = (id: number, remark: string) => {
    return useHttp(`${API_PREFIX.USER}/appeal/admin/${id}/reject`, {
      method: "POST",
      body: remark,
    });
  };

  return {
    fetchUsers,
    assignRoles,
    fetchUserRoles,
    fetchUserDetail,
    banUser,
    unbanUser,
    banUsersBatch,
    unbanUsersBatch,
    deleteUsersBatch,
    resetUsername,
    fetchBannedUsers,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
    fetchRolePermissions,
    fetchPermissionTree,
    createPermission,
    updatePermission,
    deletePermission,
    fetchCurrentUserPermissions,
    fetchAppeals,
    claimAppeal,
    releaseAppeal,
    approveAppeal,
    rejectAppeal,
  };
};
