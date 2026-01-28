import { api } from '@/lib/axios'

export async function deleteItem(id: string) {
    await api.delete(`/item/${id}`)
}
