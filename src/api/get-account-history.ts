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
  if (accountId === 'all') {
    const { getTransactions } = await import('./get-transactions')
    const response = await getTransactions({ page, perPage: limit })
    
    const history: AccountHistoryItem[] = response.transactions.transactions.map((t) => ({
      id: t.id,
      type: 'transaction',
      description: t.description || 'Transação',
      operation: t.operation,
      value: t.amount,
      date: t.data_emissao.toString(),
      created_at: t.data_emissao.toString(),
    }))

    return {
      account: {
        id: 'all',
        name: 'Visão Consolidada (Todas as Contas)',
        balance: 0
      },
      history,
      totalCount: response.transactions.totalCount,
      totalPages: Math.ceil(response.transactions.totalCount / response.transactions.perPage),
      currentPage: response.transactions.pageIndex
    } as GetAccountHistoryResponse
  }

  const response = await api.get<GetAccountHistoryResponse>(`/account/${accountId}/history`, {
    params: {
      page,
      limit,
    },
  })

  return response.data
}
