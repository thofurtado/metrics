import { api } from '@/lib/axios'

export interface GetTransactionsQuery {
  page?: number | null
  description?: string | null
  value?: number | null
  sectorId?: string | null
  accountId?: string | null
  status?: string | null
  toDate?: string | null
}

export interface GetTransactionsResponse {
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
}

export async function getTransactions({
  page,
  description,
  value,
  sectorId,
  accountId,
  status,
  toDate
}: GetTransactionsQuery) {

  const response = await api.get<GetTransactionsResponse>('/transactions', {
    params: {
      page,
      description,
      value,
      sector_id: sectorId,
      account_id: accountId,
      status,
      toDate
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
