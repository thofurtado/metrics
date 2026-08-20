import { api } from '@/lib/axios'

export interface Payment {
  id: string
  name: string
  installment_limit: number
  in_sight: boolean
  account_id: string | null
  show_in_menu?: boolean
}

export async function getPayments(): Promise<Payment[]> {
  try {
    const response = await api.get<any>('/payments')
    if (Array.isArray(response.data)) {
      return response.data
    }
    if (response.data && Array.isArray(response.data.payments)) {
      return response.data.payments
    }
    return []
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error)
    return []
  }
}
