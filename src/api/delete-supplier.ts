import { api } from '@/lib/axios'

export async function deleteSupplier(id: string) {
  await api.delete(`/suppliers/${id}`)
}
