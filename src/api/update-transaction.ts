import { api } from '@/lib/axios'

export interface UpdateTransactionBody {
  id: string
  description: string
  amount: number
  account_id: string
  sector_id: string | null
  data_vencimento: Date
  updateAllInGroup?: boolean
}

export async function updateTransaction({
  id,
  description,
  amount,
  account_id,
  sector_id,
  data_vencimento,
  updateAllInGroup,
}: UpdateTransactionBody) {
  const response = await api.put(`/transaction/${id}`, {
    description,
    amount,
    account_id,
    sector_id,
    data_vencimento,
    updateAllInGroup,
  })
  return response.data
}
