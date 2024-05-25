import { api } from '@/lib/axios'

export interface DeleteTransactionParams {
  id: string
}

export async function deleteTransaction({ id }: DeleteTransactionParams) {
  const response = await api.delete(`/transaction/${id}`)
  return response
}
