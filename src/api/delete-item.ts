import { api } from '@/lib/axios'

// Mergulho 15:E8: item com vendas ou movimentações não é apagado, é desativado; a nuvem responde 200 dizendo isso
// (excluído de verdade continua 204, sem corpo)
export async function deleteItem(
  id: string,
): Promise<{ inactivated: boolean; message?: string }> {
  const response = await api.delete(`/item/${id}`)
  return {
    inactivated: response.data?.inactivated === true,
    message: response.data?.message,
  }
}
