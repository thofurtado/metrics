export interface GetTransactionsDTO {
  transactions: {
    id: string
    operation: string
    data_vencimento: Date
    data_emissao: Date
    amount: number
    account_id: string
    sector_id: string
    description: string
    confirmed: boolean
    accounts: {
      id: string
      name: string
      description: string
      balance: number
      goal: number
    }
    sectors: {
      id: string
      name: string
    }
  }
  totalCount: number
  perPage: number
  pageIndex: number
}
