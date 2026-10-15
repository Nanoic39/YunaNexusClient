import { describe, expect, it } from 'vitest'
import { repairMojibake, repairMojibakeDeep } from './mojibake'

/** 模拟「UTF-8 字节被按 Windows-1252 误解码」得到的乱码字符串（与浏览器实际表现一致） */
const cp1252 = new TextDecoder('windows-1252')
function mojibake(text: string): string {
  return cp1252.decode(new TextEncoder().encode(text))
}

describe('repairMojibake', () => {
  it('还原纯中文乱码', () => {
    expect(repairMojibake(mojibake('用户'))).toBe('用户')
    expect(repairMojibake(mojibake('数据分析'))).toBe('数据分析')
  })

  it('对多组文本往返可还原', () => {
    const samples = ['用户门槛', '用户门户', '角色管理', '数据分析', '通知模板 · 发送记录']
    for (const text of samples) {
      const garbled = mojibake(text)
      expect(garbled).not.toBe(text)
      expect(repairMojibake(garbled)).toBe(text)
    }
  })

  it('还原中英混排乱码', () => {
    expect(repairMojibake(mojibake('用户 admin 中心'))).toBe('用户 admin 中心')
  })

  it('正常文本原样返回（真实中文不含于 Latin-1 区间）', () => {
    expect(repairMojibake('用户中心')).toBe('用户中心')
    expect(repairMojibake('Users')).toBe('Users')
    expect(repairMojibake('')).toBe('')
  })

  it('单字节 Latin-1 文本不误伤', () => {
    // 合法法语文本无法完整还原为 UTF-8，应原样返回
    expect(repairMojibake('café')).toBe('café')
  })
})

describe('repairMojibakeDeep', () => {
  it('递归还原对象与数组中的字符串', () => {
    const input = {
      code: 200,
      msg: mojibake('操作成功'),
      data: [mojibake('用户'), { name: mojibake('部门'), count: 3 }],
      ok: true,
    }
    expect(repairMojibakeDeep(input)).toEqual({
      code: 200,
      msg: '操作成功',
      data: ['用户', { name: '部门', count: 3 }],
      ok: true,
    })
  })

  it('保留非字符串字段类型', () => {
    expect(repairMojibakeDeep({ n: 1, b: false, z: null })).toEqual({ n: 1, b: false, z: null })
  })
})
