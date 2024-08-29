import { api } from '@/lib/axios'

export interface GetMonthExpenseBySectorResponse {
  sector_name: string
  amount: number
}

export async function getMonthExpenseBySector() {
  const response = await api.get<GetMonthExpenseBySectorResponse[]>(
    '/metrics/month-expense-by-sector',
  )

  return response.data
}
