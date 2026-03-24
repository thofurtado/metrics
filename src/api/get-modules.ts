import { api } from '@/lib/axios'

export interface ModuleData {
  id: string
  name: string
  slug: string
  description?: string
}

export async function getModules() {
  const response = await api.get<{ modules: ModuleData[] }>('/modules')
  return response.data.modules
}
