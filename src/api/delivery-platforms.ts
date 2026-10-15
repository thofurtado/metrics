import { api } from '@/lib/axios'

/**
 * Plataformas de entrega (iFood, 99Food...), 15/10/2026. Rotas da nuvem em /api/delivery-platforms (mesma proteção das
 * maquininhas). Sem conta = o repasse espera na Conta de Transação e a conta é escolhida na Liquidação.
 */
export interface DeliveryPlatform {
  id: string
  code: string
  name: string
  account_id: string | null
  commission_own_delivery_pct: number
  commission_platform_delivery_pct: number
  online_payment_fee_pct: number
  monthly_fee: number
  payout_weeks_after: number
  active: boolean
  created_at?: string
  updated_at?: string
  account?: { id: string; name: string } | null
  identifiers?: {
    id: string
    name: string
    payment_method_id: string | null
    active: boolean
  }[]
}

export interface SaveDeliveryPlatformBody {
  code: string
  name: string
  account_id: string | null
  commission_own_delivery_pct: number
  commission_platform_delivery_pct: number
  online_payment_fee_pct: number
  monthly_fee: number
  payout_weeks_after: number
  active: boolean
}

export async function getDeliveryPlatforms() {
  const response = await api.get<DeliveryPlatform[]>('/api/delivery-platforms')
  return Array.isArray(response.data) ? response.data : []
}

export async function createDeliveryPlatform(data: SaveDeliveryPlatformBody) {
  const response = await api.post<DeliveryPlatform>(
    '/api/delivery-platforms',
    data,
  )
  return response.data
}

export async function updateDeliveryPlatform({
  id,
  ...data
}: Partial<SaveDeliveryPlatformBody> & { id: string }) {
  const response = await api.put<DeliveryPlatform>(
    `/api/delivery-platforms/${id}`,
    data,
  )
  return response.data
}

export async function deleteDeliveryPlatform(id: string) {
  await api.delete(`/api/delivery-platforms/${id}`)
}
