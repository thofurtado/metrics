import { api } from '@/lib/axios'

export interface CreateProductBody {
    name: string
    description?: string | null
    price: number
    stock?: number | null
    min_stock?: number | null
    barcode?: string | null
    ncm?: string | null
    category?: string | null
    active?: boolean | null
    display_id?: number | null
    is_composite?: boolean
    cost?: number | null
    compositions?: {
        supply_id: string
        quantity: number
    }[]
}

export async function createProduct(body: CreateProductBody) {
    const response = await api.post('/products', body)
    return response
}
