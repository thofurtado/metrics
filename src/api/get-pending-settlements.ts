import { api } from '@/lib/axios'
import { PaginatedResponse } from './get-settlements'

export interface PendingSettlement {
  id: string
  amount: number
  totalValue: number
  description: string
  data_vencimento: string
  data_emissao: string
  payment_method: string
  interest: number
}

export async function getPendingSettlements({ 
  pageIndex = 0,
  sortBy = 'data_vencimento',
  sortDir = 'asc'
}: { 
  pageIndex?: number,
  sortBy?: string,
  sortDir?: string
} = {}) {
  const response = await api.get<PaginatedResponse<PendingSettlement>>('/pending-settlements', {
    params: {
      page: pageIndex + 1,
      limit: 50,
      sortBy,
      sortDir
    }
  })
  return response.data
}
