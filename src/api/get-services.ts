import { api } from '@/lib/axios'

// Reuse response structure pattern or similar
export interface GetServicesResponse {
    services: {
        id: string
        name: string
        description: string | null
        category: string | null
        active: boolean
        created_at: string
        updated_at: string

        // Service specific
        display_id: number
        price: number
        estimated_time: string | null
    }[]
    meta: {
        pageIndex: number
        perPage: number
        totalCount: number
    }
}

export interface GetServicesQuery {
    pageIndex?: number | null
    perPage?: number | null
    query?: string | null
    active?: boolean | null
    signal?: AbortSignal
}

export async function getServices({ pageIndex, perPage, query, active, signal }: GetServicesQuery = {}) {
    const response = await api.get<GetServicesResponse>('/services', {
        params: {
            page: pageIndex || 1,
            perPage: perPage || 10,
            query,
            active,
        },
        signal
    })

    // Default values to prevent frontend crashes
    if (!response.data) {
        return {
            ...response,
            data: {
                services: [],
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
