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
  fromDate?: string | null
  supplierId?: string | null
  type?: string | null
  month?: string | null // ISO date string used to filter by month
  sortBy?: string | null
  sortDirection?: string | null
}

export interface GetTransactionsResponse {
  transactions: {
    transactions: {
      id: string
      operation: string
      data_vencimento: Date
      data_emissao: Date
      amount: number
      account_id: string
      sector_id: string | null
      description: string | null
      confirmed: boolean
      attachment_url: string | null
      totalValue?: number | null
      payment_method?: string | null
      supplier?: {
        id: string
        name: string
      } | null
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
  fromDate,
  supplierId,
  type,
  month,
  sortBy,
  sortDirection
}: GetTransactionsQuery) {

  const response = await api.get<GetTransactionsResponse>('/transactions', {
    params: {
      page: page || 1,
      per_page: perPage,
      description,
      value,
      sector_id: sectorId,
      account_id: accountId,
      status,
      toDate,
      fromDate,
      supplier_id: supplierId,
      type,
      month,
      sortBy,
      sortDirection
    },
  })

  // Default values to prevent frontend crashes
  if (!response.data) {
    return {
      ...response,
      data: {
        transactions: {
          transactions: [] as GetTransactionsResponse['transactions']['transactions'],
          totalCount: 0,
          pageIndex: 0,
          perPage: 6,
        },
      } as GetTransactionsResponse
    }
  }

  return response
}

// <GetTransactionsResponse>
