import { api } from '@/lib/axios'

export interface Payment {
  id: string
  name: string
  installment_limit: number
  in_sight: boolean
  account_id: string | null
}

export async function getPayments() {
  const response = await api.get<Payment[]>('/payments') // A API retorna Payment[] diretamente
  return response.data // Retorna o array diretamente
}