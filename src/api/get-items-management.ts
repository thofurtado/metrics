// @/api/get-items-management.ts - NOVA API DEDICADA
import { api } from '@/lib/axios'

export interface GetItemsManagementQuery {
    page?: number | null
    name?: string | null
    type?: string | null // 'product' | 'service'
    active?: boolean | null
}

export interface GetItemsManagementResponse {
    items: {
        id: string
        name: string
        description: string | null
        cost: number
        price: number
        stock: number | null
        active: boolean
        isItem: boolean
        created_at?: Date
    }[]
    pagination: {
        pageIndex: number
        perPage: number
        totalCount: number
    }
}

export async function getItemsManagement({
    page,
    name,
    type,
    active
}: GetItemsManagementQuery) {
    const response = await api.get<GetItemsManagementResponse>('/items-management', {
        params: {
            page,
            name,
            type: type === 'all' ? null : type,
            active: active === null ? undefined : active,
        },
    })
    return response
}