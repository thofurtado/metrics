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

export async function getPendingDeliveryItemMappings(
  platform?: DeliveryPlatform,
) {
  const response = await api.get<{ pending: PendingDeliveryItemMapping[] }>(
    '/delivery/item-mappings/pending',
    { params: platform ? { platform } : undefined },
  )
  return response.data
}

export async function getDeliveryItemMappings() {
  const response = await api.get<{ mappings: DeliveryItemMapping[] }>(
    '/delivery/item-mappings',
  )
  return response.data
}

export async function createDeliveryItemMapping(data: {
  platform: DeliveryPlatform
  external_code: string
  product_id: string
  external_name?: string
}) {
  const response = await api.post<{
    mapping: DeliveryItemMapping
    fixedOrders: number
  }>('/delivery/item-mappings', data)
  return response.data
}

export async function deleteDeliveryItemMapping(id: string) {
  await api.delete(`/delivery/item-mappings/${id}`)
}

/** Item do cardápio da loja na 99Food com o vínculo (ou a sugestão pelo nome) de cada um. */
export interface Food99MenuMapping {
  external_code: string
  item_name: string
  price: number
  mapping: {
    id: string
    product: { id: string; name: string; display_id: number }
  } | null
  suggestion: { id: string; name: string; display_id: number } | null
}

export async function getFood99MenuMappings() {
  const response = await api.get<{
    shopId: string
    items: Food99MenuMapping[]
  }>('/delivery/item-mappings/food99-menu')
  return response.data
}

export async function createDeliveryItemMappingsBulk(data: {
  platform: DeliveryPlatform
  items: { external_code: string; product_id: string; external_name?: string }[]
}) {
  const response = await api.post<{ linked: number; fixedOrders: number }>(
    '/delivery/item-mappings/bulk',
    data,
  )
  return response.data
}
