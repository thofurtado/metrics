import { api } from '@/lib/axios'

export interface UpdateItemBody {
    id: string
    name?: string
    description?: string | null
    cost?: number | null
    price?: number | null
    min_stock?: number | null
    barcode?: string | null
    category?: string | null
    active?: boolean | null
    display_id?: number | null
    ncm?: string | null
    estimated_time?: string | null
    unit?: string | null
    measureUnit?: 'UNITARY' | 'FRACTIONAL'
}

export async function updateItem({ id, ...body }: UpdateItemBody) {
    const response = await api.patch(`/item/${id}`, body)
    return response
}
