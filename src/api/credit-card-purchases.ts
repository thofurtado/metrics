import { api } from '@/lib/axios'

export interface UpdateCreditCardPurchaseBody {
  amount?: number
  description?: string | null
  sector_id?: string | null
  supplier_id?: string | null
  data_emissao?: Date | string
  credit_card_id?: string
}

export type DeleteCreditCardPurchaseScope = 'one' | 'forward' | 'all'

export async function updateCreditCardPurchase(
  id: string,
  data: UpdateCreditCardPurchaseBody,
) {
  const response = await api.put(`/credit-card-purchases/${id}`, data)
  return response.data
}

export async function deleteCreditCardPurchase(
  id: string,
  scope: DeleteCreditCardPurchaseScope,
) {
  const response = await api.delete<{ deleted: number; preserved: number }>(
    `/credit-card-purchases/${id}`,
    { params: { scope } },
  )
  return response.data
}
