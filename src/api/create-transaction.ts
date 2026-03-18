import { api } from '@/lib/axios'

export interface CreateTransactionBody {
  operation: 'income' | 'expense' | 'transfer'
  amount: number
  account?: string | null
  destination_account_id?: string | null
  supplier?: string | null
  payment_method?: string | null
  data_vencimento?: Date | null
  data_emissao?: Date | null
  sector?: string | null
  description?: string | null
  confirmed?: boolean | null
  installments_count?: number | null
  interval_frequency?: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null
  custom_installments?: {
    data_vencimento: Date
    data_emissao?: Date
    amount: number
  }[] | null
}

export async function createTransaction({
  operation,
  amount,
  account,
  destination_account_id,
  supplier,
  payment_method,
  data_vencimento,
  data_emissao,
  sector,
  description,
  confirmed,
  installments_count,
  interval_frequency,
  custom_installments,
}: CreateTransactionBody) {
  const response = await api.post('/transaction', {
    operation,
    amount,
    account_id: account || null,
    destination_account_id: destination_account_id || null,
    data_vencimento,
    data_emissao,
    description: description || null,
    sector_id: sector || null,
    confirmed,
    supplier_id: supplier || null,
    payment_method: payment_method || null,
    installments_count,
    interval_frequency,
    custom_installments,
  })
  return response
}
