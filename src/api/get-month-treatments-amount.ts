import { api } from '@/lib/axios'

export interface GetMonthTreatmentsAmountResponse {
  amount: number
  diffFromLastMonth: number
}

export async function getMonthTreatmentsAmount() {
  const response = await api.get<GetMonthTreatmentsAmountResponse>(
    '/metrics/month-treatments-amount',
  )
  return response.data
}
