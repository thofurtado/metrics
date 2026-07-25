import { api } from '@/lib/axios'

export interface SystemConfig {
  merchandise: boolean
  financial: boolean
  treatments: boolean
  cashier: boolean
  cashier_default_origin?: 'Mesa' | 'Balcão' | 'Delivery'
  hr_module: boolean
  cestaBasicaValue: number
  financial_management_profile: 'ANALYTICAL' | 'OPERATIONAL'
  dashboard_cards?: Record<string, Record<string, boolean>>
}

export async function getSystemConfig() {
  const response = await api.get<SystemConfig>('/settings/modules')
  return response.data
}
