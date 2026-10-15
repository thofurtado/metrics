import { api } from '@/lib/axios'

// Fase 4 do Mergulho (16:A7): corrigir e excluir o cadastro do cliente (a nuvem não tinha essas rotas).
export interface UpdateClientBody {
  name?: string
  identification?: string | null
  phone?: string | null
  email?: string | null
  contact?: string | null
  contract?: boolean
  isEnterprise?: boolean
  allowDuplicatePhone?: boolean
}

export async function updateClient(id: string, body: UpdateClientBody) {
  const response = await api.put(`/client/${id}`, body)
  return response.data
}

export async function deleteClient(id: string) {
  await api.delete(`/client/${id}`)
}

/** 409 da nuvem quando o telefone já é de outro cliente (16:A8). */
export function duplicatePhoneMessage(err: unknown): string | null {
  const response = (
    err as {
      response?: { status?: number; data?: { code?: string; message?: string } }
    }
  )?.response
  if (response?.status === 409 && response.data?.code === 'DUPLICATE_PHONE') {
    return response.data.message || 'Já existe outro cliente com este telefone.'
  }
  return null
}
