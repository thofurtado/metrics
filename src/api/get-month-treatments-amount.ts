import { api } from '@/lib/axios'

export interface GetMonthTreatmentsAmountResponse {
  amount: number
  diffFromLastMonth: number
}

export interface MonthTreatmentsAmountFilters {
  month?: number
  year?: number
}

export async function getMonthTreatmentsAmount({ month, year }: MonthTreatmentsAmountFilters = {}) {
  const response = await api.get<GetMonthTreatmentsAmountResponse>(
    '/metrics/month-treatments-amount',
    { params: { month, year } }
  )
  return response.data
}
