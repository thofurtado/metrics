import { api } from '@/lib/axios'

export interface Settlement {
  id: string
  source_transaction_id: string
  dest_transaction_id: string
  fee_amount: number
  description: string | null
  is_automated: boolean
  created_at: string
  sourceTransaction: {
    id: string
    amount: number
    description: string
    payment_method: string
    accounts?: {
      name: string
    }
  }
  destTransaction: {
    id: string
    amount: number
    description: string
    accounts?: {
      name: string
    }
  }
}

export async function getSettlements() {
  const response = await api.get<Settlement[]>('/settlements')
  return response.data
}
