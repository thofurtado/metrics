import { api } from '@/lib/axios'

export interface RecalculateAccountBalanceBody {
  id: string
}

export async function recalculateAccountBalance({ id }: RecalculateAccountBalanceBody) {
  const response = await api.patch(`/account/${id}/recalculate`)
  return response.data
}
