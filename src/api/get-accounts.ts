import { api } from '@/lib/axios'

export interface GetAccountsResponse {
  accounts: {
    id: string
    name: string
    description: string | null
    goal: number | null
  }[]
}

export async function getAccounts() {
  const response = await api.get<GetAccountsResponse>('/accounts')
  
  return response
}
