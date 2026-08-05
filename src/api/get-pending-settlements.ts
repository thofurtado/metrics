import { api } from '@/lib/axios'

export interface PendingSettlement {
  id: string
  amount: number
  description: string
  data_vencimento: string
  data_emissao: string
  payment_method: string
  interest: number
}

export async function getPendingSettlements() {
  const response = await api.get<PendingSettlement[]>('/pending-settlements')
  return response.data
}
