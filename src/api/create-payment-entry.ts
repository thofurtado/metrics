export interface CreatePaymentEntryRequest {
  payment_id: string
  treatment_id: string
  occurrences: number
  amount: number
}

export async function createPaymentEntry(data: CreatePaymentEntryRequest) {
  // Implementação simulada - substitua pela sua API real
  const response = await fetch('/api/payment-entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Falha ao criar entrada de pagamento')
  }

  return response.json()
}