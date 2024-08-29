import { api } from '@/lib/axios'

export interface GetMonthExpensesAmountResponse {
  monthExpenseAmount: number
  alreadyPaid: number
  diffFromLastMonth: number
}

export async function getMonthExpensesAmount() {
  const response = await api.get<GetMonthExpensesAmountResponse>(
    '/metrics/month-expense-amount',
  )
  return response.data
}
