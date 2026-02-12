
import { api } from '@/lib/axios'
import { SystemConfig } from './get-system-config'

export async function updateSystemConfig(data: SystemConfig) {
    const response = await api.patch<SystemConfig>('/settings/modules', data)
    return response.data
}
