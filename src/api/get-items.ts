import { api } from '@/lib/axios'

export interface GetItemsResponse {
  items: {
    id: string
    name: string
    description: string | null
    cost: number
    price: number
    stock: number | null
    active: boolean
    isItem: boolean
  }[]
}

export async function getItems() {
  const response = await api.get<GetItemsResponse>('/items')

  return response
}
