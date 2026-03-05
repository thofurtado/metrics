import { api } from '@/lib/axios'

export interface GetMonthIncomesAmountResponse {
  monthIncomeAmount: number
  alreadyPaid: number
  diffFromLastMonth: number
}

export interface MonthIncomesAmountFilters {
  month?: number
  year?: number
}

export async function getMonthIncomesAmount({ month, year }: MonthIncomesAmountFilters = {}) {
  const response = await api.get<GetMonthIncomesAmountResponse>(
    '/metrics/month-income-amount',
    { params: { month, year } }
  )
  return response.data
}
