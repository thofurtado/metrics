import { api } from '@/lib/axios'

export interface PaymentIdentifier {
  id: string
  name: string
  payment_method_id?: string | null
  is_correntista_debt: boolean
  is_stock_evasion: boolean
  active: boolean
  created_at: string
  paymentMethod?: {
    id: string
    name: string
  }
}

export interface CreatePaymentIdentifierParams {
  name: string
  payment_method_id?: string | null
  is_correntista_debt?: boolean
  is_stock_evasion?: boolean
}

export interface UpdatePaymentIdentifierParams {
  id: string
  name?: string
  payment_method_id?: string | null
  is_correntista_debt?: boolean
  is_stock_evasion?: boolean
  active?: boolean
}

export async function getPaymentIdentifiers() {
  const response = await api.get<PaymentIdentifier[]>('/api/payment-identifiers')
  return response.data
}

export async function createPaymentIdentifier(data: CreatePaymentIdentifierParams) {
  const response = await api.post<PaymentIdentifier>('/api/payment-identifiers', data)
  return response.data
}

export async function updatePaymentIdentifier({ id, ...data }: UpdatePaymentIdentifierParams) {
  const response = await api.put<PaymentIdentifier>(`/api/payment-identifiers/${id}`, data)
  return response.data
}

export async function deletePaymentIdentifier(id: string) {
  await api.delete(`/api/payment-identifiers/${id}`)
}
