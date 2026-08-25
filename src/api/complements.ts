import { api } from '@/lib/axios'

export interface ComplementOption {
  id?: string
  name: string
  price: number
  linked_product_id?: string | null
  linked_supply_id?: string | null
  active?: boolean
}

export interface ComplementGroup {
  id: string
  name: string
  min_quantity: number
  max_quantity: number
  free_quantity: number
  active: boolean
  options: ComplementOption[]
  products?: { product_id: string }[]
  _count?: {
    products: number
  }
}

export interface CreateComplementGroupBody {
  name: string
  min_quantity?: number
  max_quantity?: number
  free_quantity?: number
  options?: ComplementOption[]
  product_ids?: string[]
}

export interface UpdateComplementGroupBody {
  name?: string
  min_quantity?: number
  max_quantity?: number
  free_quantity?: number
  active?: boolean
  options?: ComplementOption[]
  product_ids?: string[]
}

export async function getComplementGroups(): Promise<{ groups: ComplementGroup[] }> {
  const response = await api.get('/complement-groups')
  return response.data
}

export async function createComplementGroup(data: CreateComplementGroupBody): Promise<{ group: ComplementGroup }> {
  const response = await api.post('/complement-groups', data)
  return response.data
}

export async function updateComplementGroup(id: string, data: UpdateComplementGroupBody): Promise<{ group: ComplementGroup }> {
  const response = await api.put(`/complement-groups/${id}`, data)
  return response.data
}

export async function deleteComplementGroup(id: string): Promise<void> {
  await api.delete(`/complement-groups/${id}`)
}

export async function syncProductComplementGroups(productId: string, groupIds: string[]): Promise<any> {
  const response = await api.post(`/products/${productId}/complement-groups`, { groupIds })
  return response.data
}
