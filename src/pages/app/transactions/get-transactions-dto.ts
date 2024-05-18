export interface GetTransactionsDTO {
  transactions: {
    id: string
    operation: string
    date: Date
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
    sectors: null
  }
  totalCount: number
  perPage: number
  pageIndex: number
}
