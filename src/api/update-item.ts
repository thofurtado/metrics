import { api } from '@/lib/axios'

export interface UpdateItemBody {
    id: string
    name?: string
    description?: string | null
    cost?: number
    price?: number
    min_stock?: number | null
    barcode?: string | null
    category?: string | null
    active?: boolean | null
    isItem?: boolean | null
}

export async function updateItem({ id, ...body }: UpdateItemBody) {
    const response = await api.patch(`/item/${id}`, body)
    return response
}
