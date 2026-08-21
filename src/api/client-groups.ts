import { api } from '@/lib/axios'

export interface ClientGroup {
  id: string
  name: string
  description?: string
  headscale_user?: string
  vpn_preauth_key?: string
  clients: Array<{
    id: string
    name: string
    identification?: string
    equipments?: any[]
  }>
}

export async function getClientGroups(): Promise<{ groups: ClientGroup[] }> {
  const response = await api.get('/client-groups')
  return response.data
}

export async function createClientGroup(data: {
  name: string
  description?: string
  client_ids?: string[]
}): Promise<{ group: ClientGroup }> {
  const response = await api.post('/client-groups', data)
  return response.data
}

export async function updateClientGroup(
  id: string,
  data: { name?: string; description?: string; client_ids?: string[] }
): Promise<{ group: ClientGroup }> {
  const response = await api.put(`/client-groups/${id}`, data)
  return response.data
}

export async function deleteClientGroup(id: string): Promise<void> {
  await api.delete(`/client-groups/${id}`)
}
