import { api } from '@/lib/axios'

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface HistorySettlement {
  id: string
  amount: number
  totalValue: number
  description: string
  payment_method: string
  data_vencimento: string
  data_emissao: string
  created_at: string
  interest: number
  accounts?: {
    name: string
  }
}

export async function getSettlements({ pageIndex = 0 }: { pageIndex?: number } = {}) {
  const response = await api.get<PaginatedResponse<HistorySettlement>>('/settlements', {
    params: {
      page: pageIndex + 1,
    }
  })
  return response.data
}
