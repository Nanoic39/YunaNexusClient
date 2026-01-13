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

  return {
    fetchUsers,
    assignRoles,
    fetchUserRoles,
    fetchUserDetail,
    banUser,
    unbanUser,
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
  };
};
