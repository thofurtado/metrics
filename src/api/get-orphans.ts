import { api } from '@/lib/axios'

export async function getOrphans() {
  const response = await api.get('/equipments/orphans')
  return response.data
}

