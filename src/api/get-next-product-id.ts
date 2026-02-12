import { api } from '@/lib/axios'

export async function getNextProductId() {
    const response = await api.get<{ nextId: number }>('/products/next-id')
    return response.data
}
