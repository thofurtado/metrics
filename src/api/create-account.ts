import { api } from '@/lib/axios'

export interface CreateAccountBody {
    name: string
    description?: string | null
    balance: number
    goal?: number | null
}

export async function createAccount(data: CreateAccountBody) {
    const response = await api.post('/account', data)
    return response.data
}
