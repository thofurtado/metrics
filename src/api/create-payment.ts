import { api } from '@/lib/axios'

export interface CreatePaymentBody {
  name: string
  installment_limit: number
  in_sight: boolean
  account_id?: string | null
  sefaz_tPag?: string | null
  /** 'PLATAFORMA' = paga no app do iFood/99 (não exige conta); null/ausente = forma comum */
  kind?: 'PLATAFORMA' | null
}

export async function createPayment(data: CreatePaymentBody) {
  await api.post('/payment', data)
}
