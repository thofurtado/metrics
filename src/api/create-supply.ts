import { api } from '@/lib/axios'

export interface CreateSupplyBody {
    name: string
    description?: string | null
    cost: number
    stock?: number | null
    unit?: string | null
    category?: string | null
    active?: boolean | null
}

export async function createSupply(body: CreateSupplyBody) {
    const response = await api.post('/supplies', body)
    return response
}
