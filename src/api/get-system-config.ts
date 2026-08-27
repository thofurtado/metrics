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

export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const response = await api.get<SystemConfig>('/settings/modules')
    return response.data
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return {
        merchandise: true,
        financial: true,
        treatments: true,
        cashier: false,
        cashier_default_origin: 'Mesa',
        hr_module: true,
        cestaBasicaValue: 0,
        financial_management_profile: 'OPERATIONAL',
      }
    }
    throw error
  }
}
