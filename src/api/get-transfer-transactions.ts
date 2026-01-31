
import { api } from '@/lib/axios'

export interface GetTransferTransactionsResponse {
    transferTransactions: {
        id: string
        destination_account_id: string
        transaction_id: string
        transaction: {
            id: string
            amount: number
            date: string
            description: string | null
            accounts: {
                name: string
            }
        }
        accounts: {
            name: string
        }
    }[]
}

export async function getTransferTransactions() {
    const response = await api.get<GetTransferTransactionsResponse>('/transfer-transactions')
    return response.data
}
