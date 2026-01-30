import { api } from '@/lib/axios'

export interface CreateSectorBody {
    name: string
    type: 'in' | 'out'
    budget?: number | null
}

export async function createSector(data: CreateSectorBody) {
    const response = await api.post('/sector', data)
    return response.data
}
