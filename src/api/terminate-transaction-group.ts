import { api } from '@/lib/axios'

export interface TerminateTransactionGroupParams {
    groupId: string
    lastKeptTransactionId: string
}

export async function terminateTransactionGroup({ groupId, lastKeptTransactionId }: TerminateTransactionGroupParams) {
    await api.patch(`/transaction-groups/${groupId}/terminate`, {
        lastKeptTransactionId
    })
}
