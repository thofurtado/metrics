import { api } from '@/lib/axios'

export interface UpdateTransactionCheckedParams {
  id: string
  checked: boolean
}

export async function updateTransactionChecked({
  id,
  checked,
}: UpdateTransactionCheckedParams) {
  await api.patch(`/transaction/${id}/checked`, { checked })
}
