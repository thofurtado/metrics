import { api } from '@/lib/axios'

export interface AccountHistoryItem {
  id: string
  type: string
  description: string
  operation: string
  value: number
  previous_balance?: number
  new_balance?: number
  date: string
  created_at: string
}

export interface GetAccountHistoryResponse {
  account: {
    id: string
    name: string
    balance: number
  }
  history: AccountHistoryItem[]
  totalCount: number
  totalPages: number
  currentPage: number
}

interface GetAccountHistoryQuery {
  accountId: string
  page?: number
  limit?: number
}

export async function getAccountHistory({ accountId, page = 1, limit = 20 }: GetAccountHistoryQuery) {
  const response = await api.get<GetAccountHistoryResponse>(`/account/${accountId}/history`, {
    params: {
      page,
      limit,
    },
  })

  return response.data
}
