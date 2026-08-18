import { api } from '@/lib/axios'

export interface Payment {
  id: string
  name: string
  installment_limit: number
  in_sight: boolean
  account_id: string | null
  show_in_menu?: boolean
}

export async function getPayments() {
  const response = await api.get<Payment[]>('/payments')
  return response.data
}
