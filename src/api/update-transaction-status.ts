import { api } from '@/lib/axios'

export interface UpdateStatusTransactionParams {
  id: string
}

export async function updateStatusTransaction({
  id,
}: UpdateStatusTransactionParams) {
  await api.patch(`/switch-transaction/${id}`)
}
