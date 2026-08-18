import { api } from '@/lib/axios'

export interface CreatePaymentBody {
  name: string
  installment_limit: number
  in_sight: boolean
  account_id?: string
  sefaz_tPag?: string | null
}

export async function createPayment(data: CreatePaymentBody) {
  await api.post('/payment', data)
}
