import { api } from '@/lib/axios'

export interface ExpenseByCategory {
  category: string
  amount: number
}

export interface MonthlySummaryResponse {
  revenue: {
    total: number
    count: number
    averageTicket: number
    paid: number
    open: number
  }
  expenses: {
    total: number
    count: number
    interestPaid: number
    paid: number
    open: number
  }
  balance: number
  expensesByCategory: ExpenseByCategory[]
}

export async function getMonthlySummary(month: Date) {
  const response = await api.get<MonthlySummaryResponse>('/transactions/monthly-summary', {
    params: {
      month: month.toISOString()
    }
  })
  
  return response.data
}
