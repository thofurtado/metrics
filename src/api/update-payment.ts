import { api } from '@/lib/axios'

export interface UpdatePaymentBody {
  name?: string
  installment_limit?: number
  in_sight?: boolean
  account_id?: string
  sefaz_tPag?: string | null
  show_in_menu?: boolean
}

export interface UpdatePaymentParams {
  id: string
  data: UpdatePaymentBody
}

export async function updatePayment({ id, data }: UpdatePaymentParams) {
  const response = await api.put(`/payment/${id}`, data)
  return response.data
}
