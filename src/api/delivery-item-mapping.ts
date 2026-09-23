import { api } from '@/lib/axios'

export type DeliveryPlatform = 'IFOOD' | '99FOOD'

export interface PendingDeliveryItemMapping {
  platform: DeliveryPlatform
  external_code: string
  external_name: string | null
  occurrences: number
  last_seen: string
}

export interface DeliveryItemMapping {
  id: string
  platform: DeliveryPlatform
  external_code: string
  external_name: string | null
  product_id: string
  product: { id: string; name: string }
  created_at: string
  updated_at: string
}

export async function getPendingDeliveryItemMappings(platform?: DeliveryPlatform) {
  const response = await api.get<{ pending: PendingDeliveryItemMapping[] }>(
    '/delivery/item-mappings/pending',
    { params: platform ? { platform } : undefined },
  )
  return response.data
}

export async function getDeliveryItemMappings() {
  const response = await api.get<{ mappings: DeliveryItemMapping[] }>('/delivery/item-mappings')
  return response.data
}

export async function createDeliveryItemMapping(data: {
  platform: DeliveryPlatform
  external_code: string
  product_id: string
}) {
  const response = await api.post<{ mapping: DeliveryItemMapping; fixedOrders: number }>(
    '/delivery/item-mappings',
    data,
  )
  return response.data
}

export async function deleteDeliveryItemMapping(id: string) {
  await api.delete(`/delivery/item-mappings/${id}`)
}
