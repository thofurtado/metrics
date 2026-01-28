import { api } from '@/lib/axios'

export interface GetItemsResponse {
  items: {
    id: string
    display_id: number
    name: string
    description: string | null
    cost: number
    price: number
    stock: number | null
    min_stock: number | null
    barcode: string | null
    category: string | null
    active: boolean
    isItem: boolean
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
  is_product?: boolean | null
  below_min_stock?: boolean | null
  signal?: AbortSignal
}

export async function getItems({ pageIndex, limit, name, display_id, is_product, below_min_stock, signal }: GetItemsQuery = {}) {
  const response = await api.get<GetItemsResponse>('/items', {
    params: {
      page: pageIndex || 1,
      limit: limit || 6,
      name,
      display_id,
      is_product,
      below_min_stock
    },
    signal
  })

  return response
}
