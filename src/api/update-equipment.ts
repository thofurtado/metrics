import { api } from '@/lib/axios'

export interface UpdateEquipmentRequest {
  id: string
  identification?: string | null
  type?: string
  brand?: string | null
  details?: string | null
  client_id?: string | null
}

export async function updateEquipment({ id, ...data }: UpdateEquipmentRequest) {
  const response = await api.put(`/equipments/${id}`, data)
  return response.data
}
