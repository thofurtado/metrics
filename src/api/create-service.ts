import { api } from '@/lib/axios'

export interface CreateServiceBody {
    name: string
    description?: string | null
    price: number
    estimated_time?: string | null
    category?: string | null
    active?: boolean | null
    display_id?: number | null
}

export async function createService(body: CreateServiceBody) {
    const response = await api.post('/services', body)
    return response
}
