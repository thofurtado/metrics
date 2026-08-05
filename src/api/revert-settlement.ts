import { api } from '@/lib/axios'

export async function revertSettlement({ id }: { id: string }) {
  await api.delete(`/settlements/${id}`)
}
