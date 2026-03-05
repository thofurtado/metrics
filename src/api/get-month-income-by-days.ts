import { api } from '@/lib/axios'

export interface GetMonthIncomesByDayResponse {
  day: string
  revenue: number
}

export interface MonthIncomesByDayFilters {
  month?: number
  year?: number
}

export async function getMonthIncomesByDay({ month, year }: MonthIncomesByDayFilters = {}) {
  const response = await api.get<GetMonthIncomesByDayResponse[]>(
    '/metrics/month-income-by-days',
    { params: { month, year } }
  )
  return response.data
}
