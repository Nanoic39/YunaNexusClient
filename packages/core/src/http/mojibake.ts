/**
 * 乱码容错。
 *
 * 后端若把 UTF-8 字节按 Windows-1252 / Latin-1 误解码后再次以 UTF-8 输出（如数据库连接字符集配置不当），
 * 前端收到的就是「ç”¨æˆ·」这类乱码。此模块在前端做**只读容错还原**，不改写后端，属于兜底：
 * - 后端修复字符集后，本模块自动失效（真实中文 > U+00FF，无法映射为字节，直接跳过）。
 * - 仅在能完整还原为合法 UTF-8 时才替换，否则原样返回。
 */

/** Windows-1252 在 0x80–0x9F 的字符 → 原始字节（cp1252 解码的反向表） */
const CP1252_REVERSE: Readonly<Record<number, number>> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

const decoder = new TextDecoder('utf-8', { fatal: true })

/**
 * 还原单个字符串中的乱码。
 *
 * 返回原字符串表示「非此类乱码」或「无法完整还原」——即对正常文本恒为无副作用。
 */
export function repairMojibake(input: string): string {
  // 纯 ASCII 无需处理，且避免高频字符串的无谓开销
  if (!/[\u0080-\uffff]/.test(input)) return input

  const bytes = new Uint8Array(input.length)
  let hasHighByte = false
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    const byte = code <= 0xff ? code : CP1252_REVERSE[code]
    // 出现无法映射的字符（如真实中日韩文字 > U+00FF）→ 判定不是本类乱码，放弃
    if (byte === undefined) return input
    if (byte >= 0x80) hasHighByte = true
    bytes[i] = byte
  }
  if (!hasHighByte) return input

  try {
    const repaired = decoder.decode(bytes)
    // 还原后仍是纯 ASCII / 未发生变化则不作替换
    return repaired === input ? input : repaired
  } catch {
    return input
  }
}

/** 递归还原对象/数组中的字符串字段（就地构建新值，不修改入参） */
export function repairMojibakeDeep<T>(value: T): T {
  if (typeof value === 'string') return repairMojibake(value) as unknown as T
  if (Array.isArray(value)) return value.map((item) => repairMojibakeDeep(item)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) out[key] = repairMojibakeDeep(item)
    return out as unknown as T
  }
  return value
}
