import { api } from '@/lib/axios'

export interface GetTransactionsQuery {
  page?: number | null
  perPage?: number | null
  description?: string | null
  value?: number | null
  sectorId?: string | null
  accountId?: string | null
  status?: string | null
  toDate?: string | null
  supplierId?: string | null
}

export interface GetTransactionsResponse {
  transactions: {
    transactions: {
      id: string
      operation: string
      date: Date
      amount: number
      account_id: string
      sector_id: string | null
      description: string | null
      confirmed: boolean
    }[]
    totalCount: number
    pageIndex: number
    perPage: number
  }
}

export async function getTransactions({
  page,
  perPage,
  description,
  value,
  sectorId,
  accountId,
  status,
  toDate,
  supplierId
}: GetTransactionsQuery) {

  const response = await api.get<GetTransactionsResponse>('/transactions', {
    params: {
      page,
      per_page: perPage,
      description,
      value,
      sector_id: sectorId,
      account_id: accountId,
      status,
      toDate,
      supplier_id: supplierId
    },
  })

  // Default values to prevent frontend crashes
  if (!response.data) {
    return {
      ...response,
      data: {
        transactions: [],
      }
    }
  }

  return response
}

// <GetTransactionsResponse>
