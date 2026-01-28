
import { api } from '@/lib/axios'

export interface AdjustAccountBalanceParams {
    id: string
    newBalance: number
}

export async function adjustAccountBalance({
    id,
    newBalance,
}: AdjustAccountBalanceParams) {
    await api.patch(`/account/${id}/adjust-balance`, {
        newBalance,
    })
}
