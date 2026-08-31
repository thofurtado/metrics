import { api } from '@/lib/axios'

export interface SettlementSummary {
  totalGross: number
  totalNet: number
  totalFees: number
  count: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  summary?: SettlementSummary
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

export async function getSettlements({
  pageIndex = 0,
  sortBy = 'data_vencimento',
  sortDir = 'desc',
  month,
  year,
  type = 'automatic',
}: {
  pageIndex?: number
  sortBy?: string
  sortDir?: string
  month?: number
  year?: number
  type?: 'automatic' | 'term' | 'all'
} = {}) {
  const response = await api.get<PaginatedResponse<HistorySettlement>>(
    '/settlements',
    {
      params: {
        page: pageIndex + 1,
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
