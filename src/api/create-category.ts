import { api } from '@/lib/axios'

export interface CreateCategoryBody {
    name: string
}

export async function createCategory(body: CreateCategoryBody) {
    const response = await api.post('/categories', body)
    return response.data
}
