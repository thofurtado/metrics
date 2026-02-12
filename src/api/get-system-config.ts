
import { api } from '@/lib/axios'

export interface SystemConfig {
    merchandise: boolean
    financial: boolean
    treatments: boolean
}

export async function getSystemConfig() {
    const response = await api.get<SystemConfig>('/settings/modules')
    return response.data
}
