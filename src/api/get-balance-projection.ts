import { api } from '@/lib/axios'

export interface BalanceProjectionResponse {
  projection: {
    currentBalance: number
    dailyBalances: Array<{
      date: string
      balance: number
      isProjection: boolean
    }>
  }
}

export async function getBalanceProjectionData() {
  const response = await api.get<BalanceProjectionResponse>('/balance-projection')
  return response.data
}