import { api } from '@/lib/axios'

export interface GetItemsResponse {
  items: {
    id: string
    name: string
    description: string | null
    category: string | { id: string; name: string } | null
    active: boolean
    type: 'PRODUCT' | 'SERVICE' | 'SUPPLY'
    product: {
      display_id: number
      price: number
      cost: number | null
      stock: number
      min_stock: number | null
      barcode: string | null
      ncm: string | null
      is_composite: boolean
      compositions: {
        quantity: number
        supply: {
          id: string
          name: string
          stock: number
          unit: string | null
        }
      }[]
    } | null
    service: {
      display_id: number
      price: number
      estimated_time: string | null
    } | null
    supply: {
      stock: number
      cost: number
      unit: string | null
    } | null
  }[]
  meta: {
    pageIndex: number
    perPage: number
    totalCount: number
  }
}

export interface GetItemsQuery {
  pageIndex?: number | null
  limit?: number | null
  name?: string | null
  display_id?: number | null
  type?: 'PRODUCT' | 'SERVICE' | 'SUPPLY' | null
  below_min_stock?: boolean | null
  signal?: AbortSignal
}

export async function getItems({ pageIndex, limit, name, display_id, type, below_min_stock, signal }: GetItemsQuery = {}) {
  const response = await api.get<GetItemsResponse>('/items', {
    params: {
      page: pageIndex || 1,
      limit: limit || 10,
      name,
      display_id,
      type,
      below_min_stock
    },
    signal
  })

  // Default values to prevent frontend crashes
  if (!response.data) {
    return {
      ...response,
      data: {
        items: [],
        meta: {
          pageIndex: pageIndex || 1,
          perPage: limit || 10,
          totalCount: 0
        }
      }
    }
  }

  return response
}
