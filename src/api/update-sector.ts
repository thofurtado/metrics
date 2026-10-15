import { api } from '@/lib/axios'

// Fase 4 do Mergulho (17:U9): renomear e excluir setor (categoria de receita/despesa). Só administrador.
export interface UpdateSectorBody {
  name?: string
  budget?: number | null
  type?: 'in' | 'out'
}

export async function updateSector(id: string, body: UpdateSectorBody) {
  const response = await api.put(`/sector/${id}`, body)
  return response.data
}

export async function deleteSector(id: string) {
  await api.delete(`/sector/${id}`)
}
