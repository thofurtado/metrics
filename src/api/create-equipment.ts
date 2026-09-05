import { api } from '@/lib/axios'

export interface CreateEquipmentRequest {
  client_id?: string | null
  type: string
  identification?: string | null
  brand?: string | null
  details?: string | null
}

export async function createEquipment(data: CreateEquipmentRequest) {
  const response = await api.post('/equipments', data)
  return response.data
}
