/** 无浏览器依赖的导航策略，不能用外部 URL/登录循环作为回跳目标。 */
export function loginDestination(value: unknown, admin: boolean): string {
  const fallback = admin ? '/console' : '/usr'
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\r\n]/.test(value)
  )
    return fallback
  const url = new URL(value, 'https://workspace.invalid')
  if (url.origin !== 'https://workspace.invalid') return fallback
  if (!(
    url.pathname === '/usr' ||
    url.pathname.startsWith('/usr/') ||
    url.pathname === '/console' ||
    url.pathname.startsWith('/console/')
  ))
    return fallback
  return url.pathname + url.search + url.hash
}
export function accessDecision(
  authenticated: boolean,
  admin: boolean,
  requiresAdmin: boolean,
): 'login' | 'forbidden' | 'allow' {
  if (!authenticated) return 'login'
  return requiresAdmin && !admin ? 'forbidden' : 'allow'
}
