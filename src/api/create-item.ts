import { api } from '@/lib/axios'

export interface CreateItemBody {
    name: string
    description?: string | null
    cost: number
    price: number
    stock?: number | null
    min_stock?: number | null
    barcode?: string | null
    category?: string | null
    isItem?: boolean | null
    active?: boolean | null
    display_id?: number | null
}

export async function createItem(body: CreateItemBody) {
    const response = await api.post('/item', body)
    return response
}
