import { api } from '@/lib/axios'

export interface GetSuppliersQuery {
    page?: number
    perPage?: number
    query?: string
}

export interface Supplier {
    id: string
    name: string
    document: string | null
    email: string | null
    phone: string | null
    created_at: string
}

export interface GetSuppliersResponse {
    suppliers: Supplier[]
    count: number
}

export async function getSuppliers({ page, perPage, query }: GetSuppliersQuery) {
    const response = await api.get<GetSuppliersResponse>('/suppliers', {
        params: {
            page,
            perPage,
            query,
        }
    })

    return response.data
}
