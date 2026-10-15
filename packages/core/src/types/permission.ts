import type { PageQuery } from './result'

/** 数据范围：1-全部 2-本部门 3-本部门及以下 4-仅本人 5-自定义 */
export type DataScope = 1 | 2 | 3 | 4 | 5

/** 角色简要信息（当前用户视图中的角色，仅含标识与名称） */
export interface RoleBrief {
  id: number
  roleCode: string
  roleName: string
}

/** 当前登录用户的权限视图（对外 `GET /api/v1/permission/me`） */
export interface CurrentUserView {
  userId: number | null
  /** 用户绑定的启用角色 */
  roles: RoleBrief[]
  /** 角色权限并集（permCode，去重升序） */
  permissions: string[]
  /** 用户可见菜单树 */
  menus: MenuTreeNode[]
}

/** 角色（perm_role） */
export interface RoleView {
  id: number
  roleCode: string
  roleName: string
  description: string | null
  dataScope: DataScope
  /** 1-启用 0-禁用 */
  status: number
  createTime: string | null
  updateTime: string | null
}

/** 角色保存请求体 */
export interface RoleSavePayload {
  roleCode: string
  roleName: string
  description?: string
  dataScope?: DataScope
  status?: number
}

/** 权限（perm_permission） */
export interface PermissionView {
  id: number
  permCode: string
  permName: string
  /** 资源标识，如 /api/v1/file/upload */
  resource: string | null
  /** 动作，如 read / write / * */
  action: string | null
  description: string | null
  status: number
  createTime: string | null
  updateTime: string | null
}

/** 菜单树节点 */
export interface MenuTreeNode {
  id: number
  menuCode: string
  menuName: string
  parentId: number
  path: string | null
  sort: number
  children: MenuTreeNode[]
}

/** 部门树节点 */
export interface DeptTreeNode {
  id: number
  deptCode: string
  deptName: string
  parentId: number
  sort: number
  status: number
  children: DeptTreeNode[]
}

/** ABAC 策略中的条件项 */
export interface PolicyCondition {
  attribute: string
  operator: 'EQ' | 'NE' | 'IN' | 'NOT_IN' | 'EXISTS' | 'NOT_EXISTS'
  value?: string
}

/** ABAC 策略 */
export interface PolicyView {
  id: number
  policyName: string
  resource: string
  action: string
  /** 1-允许 0-拒绝 */
  effect: number
  conditions: string
  priority: number
  createTime: string | null
  updateTime: string | null
}

/** 资源实例级授权 */
export interface GrantView {
  id: number
  /** 1-用户 2-角色 3-部门 */
  subjectType: number
  subjectId: number
  resourceType: string
  resourceId: string
  action: string
  effect: number
  expireTime: string | null
  status: number
}

/** 字段级权限规则 */
export interface FieldRuleView {
  id: number
  subjectType: number
  subjectId: number
  resourceType: string
  fieldName: string
  /** 1-读 2-写 */
  access: number
  effect: number
  status: number
}

/** 列表查询基类 */
export interface PermissionQuery extends PageQuery {
  keyword?: string
}
