import { userHttp } from '../http/client'
export interface AppPermission {
  code: string
  name: string
}
export interface AppRole {
  code: string
  name: string
}
export interface AppAccessCatalog {
  clientId: string
  permissions: AppPermission[]
  roles: AppRole[]
  bindings: { roleCode: string; permissionCode: string }[]
}
const path = (id: number) => `/api/v1/auth/account/oauth-apps/${id}/access`
export const applicationAccessApi = {
  catalog: (id: number) => userHttp.request<AppAccessCatalog>(path(id)),
  permission: (id: number, body: AppPermission) =>
    userHttp.request<void>(`${path(id)}/permissions`, { method: 'POST', body }),
  role: (id: number, body: AppRole & { permissions: string[] }) =>
    userHttp.request<void>(`${path(id)}/roles`, { method: 'POST', body }),
  remove: (id: number, kind: 'roles' | 'permissions', code: string) =>
    userHttp.request<void>(`${path(id)}/${kind}/${encodeURIComponent(code)}`, { method: 'DELETE' }),
  member: (id: number, externalId: string, roles: string[]) =>
    userHttp.request<void>(`${path(id)}/members`, { method: 'POST', body: { externalId, roles } }),
}
