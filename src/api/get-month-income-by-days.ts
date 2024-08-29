import { api } from '@/lib/axios'

export interface GetMonthIncomesByDayResponse {
  day: string
  revenue: number
}

export async function getMonthIncomesByDay() {
  const response = await api.get<GetMonthIncomesByDayResponse[]>(
    '/metrics/month-income-by-days',
  )
  return response.data
}
