import { api } from '@/lib/axios'

interface RevertTransactionParams {
    id: string
}

export async function revertTransactionStatus({ id }: RevertTransactionParams) {
    await api.patch(`/revert-transaction/${id}`)
}
