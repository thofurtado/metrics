import { api } from '@/lib/axios'

export interface LinkEquipmentRequest {
  id: string
  client_id: string
}

export async function linkEquipment({ id, client_id }: LinkEquipmentRequest) {
  await api.put(/equipments//link-client, { client_id })
}