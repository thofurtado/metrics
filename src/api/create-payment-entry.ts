import { api } from '@/lib/axios'

export interface CreatePaymentEntryRequest {
  payment_id: string
  treatment_id: string
  occurrences: number
  amount: number
}

export async function createPaymentEntry(data: CreatePaymentEntryRequest) {
  const response = await api.post('/payment-entry', {
    payment_id: data.payment_id,
    treatment_id: data.treatment_id,
    occurrences: data.occurrences,
    amount: data.amount,
  })

  // The axios interceptor might handle errors or return a specific structure.
  // Assuming standard axios behavior or the interceptor returns specific object.
  // The current interceptor resolves errors with { isError: true }, so we should check that.

  if ((response as any).isError) {
    throw new Error('Falha ao criar entrada de pagamento')
  }

  return response.data
}