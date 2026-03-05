import { api } from '@/lib/axios'

export interface GetMonthExpenseBySectorResponse {
  sector_name: string
  amount: number
}

export interface MonthExpenseBySectorFilters {
  month?: number
  year?: number
}

export async function getMonthExpenseBySector({ month, year }: MonthExpenseBySectorFilters = {}) {
  const response = await api.get<GetMonthExpenseBySectorResponse[]>(
    '/metrics/month-expense-by-sector',
    { params: { month, year } }
  )

  return response.data
}
