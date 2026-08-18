import { api } from '@/lib/axios'

export interface LinkEquipmentRequest {
  id?: string
  equipmentId?: string
  client_id?: string
  clientId?: string
}

export async function linkEquipment(params: LinkEquipmentRequest) {
  const equipmentId = params.id || params.equipmentId
  const clientId = params.client_id || params.clientId

  if (!equipmentId || !clientId) {
    throw new Error('Equipamento e Cliente são obrigatórios para realizar o vínculo.')
  }

  await api.put(`/equipments/${equipmentId}/link-client`, { client_id: clientId })
}
