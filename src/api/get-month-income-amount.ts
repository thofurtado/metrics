import { api } from '@/lib/axios'

export interface GetMonthIncomesAmountResponse {
  monthIncomeAmount: number
  alreadyPaid: number
  diffFromLastMonth: number
}

export async function getMonthIncomesAmount() {
  const response = await api.get<GetMonthIncomesAmountResponse>(
    '/metrics/month-income-amount',
  )
  return response.data
}
