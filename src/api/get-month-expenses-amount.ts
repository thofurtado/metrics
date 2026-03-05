import { api } from '@/lib/axios'

export interface GetMonthExpensesAmountResponse {
  monthExpenseAmount: number
  alreadyPaid: number
  diffFromLastMonth: number
}

export interface MonthExpensesAmountFilters {
  month?: number
  year?: number
}

export async function getMonthExpensesAmount({ month, year }: MonthExpensesAmountFilters = {}) {
  const response = await api.get<GetMonthExpensesAmountResponse>(
    '/metrics/month-expense-amount',
    { params: { month, year } }
  )
  return response.data
}
