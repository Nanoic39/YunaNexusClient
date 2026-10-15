import { adminHttp, userHttp } from '../http/client'
import type {
  CurrentUserView,
  DeptSavePayload,
  DeptTreeNode,
  DeptView,
  FieldRuleView,
  GrantView,
  MenuSavePayload,
  MenuTreeNode,
  MenuView,
  PermissionSavePayload,
  PermissionView,
  PolicyView,
  RoleSavePayload,
  RoleView,
} from '../types'

const BASE = '/api/v1/permission/admin'

/** 权限中心 · 当前登录用户（对外，需登录态） */
export const currentUserApi = {
  /** 当前用户的身份 / 角色 / 权限 / 菜单（`GET /api/v1/permission/me`） */
  me: () => userHttp.request<CurrentUserView>('/api/v1/permission/me'),
}

/** 权限中心 · 角色管理 */
export const roleApi = {
  list: () => adminHttp.request<RoleView[]>(`${BASE}/roles`),
  get: (id: number) => adminHttp.request<RoleView>(`${BASE}/roles/${id}`),
  create: (payload: RoleSavePayload) => adminHttp.request<RoleView>(`${BASE}/roles`, { method: 'POST', body: payload }),
  update: (id: number, payload: RoleSavePayload) =>
    adminHttp.request<RoleView>(`${BASE}/roles/${id}`, { method: 'POST', body: payload }),
  remove: (id: number) => adminHttp.request<void>(`${BASE}/roles/${id}`, { method: 'DELETE' }),

  /** 角色权限 ID 列表 */
  listPermissions: (roleId: number) => adminHttp.request<number[]>(`${BASE}/roles/${roleId}/permissions`),
  /** 设置角色权限（覆盖式） */
  setPermissions: (roleId: number, permissionIds: number[]) =>
    adminHttp.request<void>(`${BASE}/roles/${roleId}/permissions`, { method: 'POST', body: { permissionIds } }),

  /** 角色菜单 ID 列表 */
  listMenus: (roleId: number) => adminHttp.request<number[]>(`${BASE}/roles/${roleId}/menus`),
  /** 设置角色菜单（覆盖式） */
  setMenus: (roleId: number, menuIds: number[]) =>
    adminHttp.request<void>(`${BASE}/roles/${roleId}/menus`, { method: 'POST', body: { menuIds } }),

  /** 角色数据范围部门 ID 列表（dataScope=自定义 时生效） */
  listDepts: (roleId: number) => adminHttp.request<number[]>(`${BASE}/roles/${roleId}/depts`),
  /** 设置角色数据范围部门（覆盖式） */
  setDepts: (roleId: number, deptIds: number[]) =>
    adminHttp.request<void>(`${BASE}/roles/${roleId}/depts`, { method: 'POST', body: { deptIds } }),
}

/** 权限中心 · 权限管理 */
export const permissionApi = {
  list: () => adminHttp.request<PermissionView[]>(`${BASE}/permissions`),
  get: (id: number) => adminHttp.request<PermissionView>(`${BASE}/permissions/${id}`),
  create: (payload: PermissionSavePayload) =>
    adminHttp.request<PermissionView>(`${BASE}/permissions`, { method: 'POST', body: payload }),
  update: (id: number, payload: PermissionSavePayload) =>
    adminHttp.request<PermissionView>(`${BASE}/permissions/${id}`, { method: 'POST', body: payload }),
  remove: (id: number) => adminHttp.request<void>(`${BASE}/permissions/${id}`, { method: 'DELETE' }),
}

/** 权限中心 · 用户角色绑定 */
export const userRoleApi = {
  list: (userId: number) => adminHttp.request<number[]>(`${BASE}/users/${userId}/roles`),
  set: (userId: number, roleIds: number[]) =>
    adminHttp.request<void>(`${BASE}/users/${userId}/roles`, { method: 'POST', body: { roleIds } }),
}

/** 权限中心 · 菜单管理 */
export const menuApi = {
  list: () => adminHttp.request<MenuView[]>(`${BASE}/menus`),
  tree: () => adminHttp.request<MenuTreeNode[]>(`${BASE}/menus/tree`),
  get: (id: number) => adminHttp.request<MenuView>(`${BASE}/menus/${id}`),
  create: (payload: MenuSavePayload) =>
    adminHttp.request<MenuView>(`${BASE}/menus`, { method: 'POST', body: payload }),
  update: (id: number, payload: MenuSavePayload) =>
    adminHttp.request<MenuView>(`${BASE}/menus/${id}`, { method: 'POST', body: payload }),
  remove: (id: number) => adminHttp.request<void>(`${BASE}/menus/${id}`, { method: 'DELETE' }),
}

/** 权限中心 · 部门管理 */
export const deptApi = {
  list: () => adminHttp.request<DeptView[]>(`${BASE}/depts`),
  tree: () => adminHttp.request<DeptTreeNode[]>(`${BASE}/depts/tree`),
  get: (id: number) => adminHttp.request<DeptView>(`${BASE}/depts/${id}`),
  create: (payload: DeptSavePayload) =>
    adminHttp.request<DeptView>(`${BASE}/depts`, { method: 'POST', body: payload }),
  update: (id: number, payload: DeptSavePayload) =>
    adminHttp.request<DeptView>(`${BASE}/depts/${id}`, { method: 'POST', body: payload }),
  remove: (id: number) => adminHttp.request<void>(`${BASE}/depts/${id}`, { method: 'DELETE' }),
}

/** 权限中心 · ABAC 策略 */
export const policyApi = {
  list: () => adminHttp.request<PolicyView[]>(`${BASE}/policies`),
}

/** 权限中心 · 资源实例级授权 */
export const grantApi = {
  list: () => adminHttp.request<GrantView[]>(`${BASE}/grants`),
}

/** 权限中心 · 字段级权限规则 */
export const fieldRuleApi = {
  list: () => adminHttp.request<FieldRuleView[]>(`${BASE}/fields`),
}
