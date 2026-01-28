import { api } from '@/lib/axios'

export interface CreateStockBody {
    item_id: string
    quantity: number
    operation: 'IN' | 'OUT'
    description?: string | null
    created_at?: Date | null
}

export async function createStock(body: CreateStockBody) {
    const response = await api.post('/stock', body)
    return response.data
}
