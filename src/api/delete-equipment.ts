import { api } from '@/lib/axios'

export async function deleteEquipment(id: string) {
  const response = await api.delete(`/equipments/${id}`)
  return response.data
}
