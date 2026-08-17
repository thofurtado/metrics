import { api } from '@/lib/axios'

export interface GetClientsResponse {
  clients: {
    id: string
    name: string
    identification: string | null
      last_telemetry: any
    phone: string | null
    email: string | null
    contract: boolean
    equipments: {
      id: string
      type: string
      brand: string | null
      hostname: string | null
      identification: string | null
      last_telemetry: any
    }[]
  }[]
}

export async function getClients() {
  const response = await api.get<GetClientsResponse>('/clients')

  return response.data.clients
}

export async function createQuickClient(data: {
  name: string
  identification?: string
  phone?: string
}) {
  const response = await api.post('/client', data)
  return response.data
}


