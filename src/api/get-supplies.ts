import { api } from '@/lib/axios'

export interface GetSuppliesResponse {
    supplies: {
        id: string
        name: string
        description: string | null
        category: string | null
        active: boolean
        created_at: string
        updated_at: string

        // Supply specific
        stock: number
        cost: number
        unit: string | null
    }[]
    meta: {
        pageIndex: number
        perPage: number
        totalCount: number
    }
}

export interface GetSuppliesQuery {
    pageIndex?: number | null
    perPage?: number | null
    query?: string | null
    signal?: AbortSignal
}

export async function getSupplies({ pageIndex, perPage, query, signal }: GetSuppliesQuery = {}) {
    const response = await api.get<GetSuppliesResponse>('/supplies', {
        params: {
            page: pageIndex || 1,
            perPage: perPage || 10,
            query,
        },
        signal
    })

    // Default values to prevent frontend crashes
    if (!response.data) {
        return {
            ...response,
            data: {
                supplies: [],
                meta: {
                    pageIndex: pageIndex || 1,
                    perPage: perPage || 10,
                    totalCount: 0
                }
            }
        }
    }

    return response
}
