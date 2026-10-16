/** Recover an outdated lazy-loaded route once per minute; never reload for business errors. */
export function recoverRouteChunk(error: unknown, target: string): boolean {
  const message = error instanceof Error ? error.message : String(error)
  if (
    !/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .+ failed|Unable to preload CSS/i.test(
      message,
    )
  )
    return false
  try {
    if (!target.startsWith('/') || target.startsWith('//') || /[\\\r\n]/.test(target)) return false
    const url = new URL(target, window.location.origin)
    if (url.origin !== window.location.origin) return false
    const previous = Number(sessionStorage.getItem('yuna.chunk-recovery'))
    if (previous && Date.now() - previous < 60000) return false
    sessionStorage.setItem('yuna.chunk-recovery', String(Date.now()))
    window.location.replace(url.toString())
    return true
  } catch {
    return false
  }
}
