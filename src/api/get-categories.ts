import { api } from '@/lib/axios'

export interface GetCategoriesResponse {
    categories: {
        id: string
        name: string
    }[]
}

export async function getCategories() {
    const response = await api.get<GetCategoriesResponse>('/categories')
    return response.data
}
