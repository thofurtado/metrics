import { api } from '@/lib/axios'

export interface DeleteTransactionParams {
  id: string
}

export async function deleteTransaction({ id }: DeleteTransactionParams) {
  const response = await api.delete(`/financial/transactions/${id}`)
  return response
}

export async function deleteFutureTransactions({ id }: DeleteTransactionParams) {
  const response = await api.delete(`/financial/transactions/${id}/forward`)
  return response
}
