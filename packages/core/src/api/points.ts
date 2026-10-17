import { userHttp } from '../http/client'
export interface PointsAccount {
  balance: number
  streak: number
  lastCheckIn: string | null
  today: string
  timeZone: string
  checkedInToday: boolean
  nextReward: number
}
export interface PointsEntry {
  id: number
  clientCode: string
  businessKey: string
  delta: number
  balance: number
  reason: string
  createdAt: string
}
const BASE = '/api/v1/auth/account/points'
export const pointsApi = {
  account: (signal?: AbortSignal) => userHttp.request<PointsAccount>(BASE, { signal }),
  checkIn: () => userHttp.request<PointsAccount>(`${BASE}/check-in`, { method: 'POST' }),
  ledger: (before = 0, signal?: AbortSignal) =>
    userHttp.request<PointsEntry[]>(`${BASE}/ledger`, { query: { before, size: 20 }, signal }),
}
