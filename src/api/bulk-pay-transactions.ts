
import { api } from "@/lib/axios"

export interface BulkPayTransactionsBody {
    transactionIds: string[]
}

export async function bulkPayTransactions({ transactionIds }: BulkPayTransactionsBody) {
    const response = await api.patch('/transactions/bulk-pay', { transactionIds })

    // Check if the custom axios interceptor returned an error object instead of throwing
    if ((response as any).isError) {
        throw new Error((response as any).statusText || 'Falha ao processar pagamentos')
    }
}
