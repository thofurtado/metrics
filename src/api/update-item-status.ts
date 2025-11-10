// @/api/update-item-status.ts - NOVA API DEDICADA
import { api } from '@/lib/axios'

export interface UpdateItemStatusParams {
    id: string
}

export async function updateItemStatus({ id }: UpdateItemStatusParams) {
    await api.patch(`/items-management/${id}/status`)
}