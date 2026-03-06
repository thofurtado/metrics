
import { api } from '@/lib/axios'

export interface SystemConfig {
    merchandise: boolean
    financial: boolean
    treatments: boolean
    hr_module: boolean
    cestaBasicaValue: number
    financial_management_profile: 'ANALYTICAL' | 'OPERATIONAL'
}

export async function getSystemConfig() {
    const response = await api.get<SystemConfig>('/settings/modules')
    return response.data
}
