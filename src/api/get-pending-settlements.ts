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
  isEmployeeVale?: boolean
  employeeName?: string
  employeeId?: string
}

export async function getPendingSettlements({
  pageIndex = 0,
  sortBy = 'data_vencimento',
  sortDir = 'asc',
  month,
  year,
  type = 'all',
}: {
  pageIndex?: number
  sortBy?: string
  sortDir?: string
  month?: number
  year?: number
  type?: 'automatic' | 'term' | 'all'
} = {}) {
  const response = await api.get<PaginatedResponse<PendingSettlement>>(
    '/pending-settlements',
    {
      params: {
        page: pageIndex + 1,
        limit: 100,
        sortBy,
        sortDir,
        month,
        year,
        type,
      },
    },
  )
  return response.data
}
