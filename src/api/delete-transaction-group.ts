import { api } from '@/lib/axios'

export interface DeleteTransactionGroupParams {
    groupId: string
}

export async function deleteTransactionGroup({ groupId }: DeleteTransactionGroupParams) {
    await api.delete(`/transaction-groups/${groupId}`)
}
