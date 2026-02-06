import { api } from '@/lib/axios'

export interface GroupTransaction {
    id: string
    date: string
    amount: number
    description: string
    confirmed: boolean
    operation: 'income' | 'expense'
}

export interface TransactionGroupDetails {
    id: string
    totalAmount: number
    installmentsCount: number
    transactions: GroupTransaction[]
}

export async function getTransactionGroup(groupId: string): Promise<TransactionGroupDetails> {
    const response = await api.get(`/transaction-groups/${groupId}`)
    return response.data.group
}
