import { api } from '@/lib/axios'

export interface GetProductsResponse {
    products: {
        id: string
        name: string
        description: string | null
        category: string | null
        active: boolean
        created_at: string
        updated_at: string

        // Product specific
        display_id: number
        price: number
        cost: number | null
        stock: number
        min_stock: number | null
        barcode: string | null
        ncm: string | null
        is_composite: boolean
        compositions?: {
            id: string
            quantity: number
            supply: {
                id: string
                name: string
                stock: number
                unit: string | null
            }
        }[]
    }[]
    meta: {
        pageIndex: number
        perPage: number
        totalCount: number
    }
}

export interface GetProductsQuery {
    pageIndex?: number | null
    perPage?: number | null
    query?: string | null
    active?: boolean | null
    signal?: AbortSignal
}

export async function getProducts({ pageIndex, perPage, query, active, signal }: GetProductsQuery = {}) {
    const response = await api.get<GetProductsResponse>('/products', {
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
                products: [],
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
