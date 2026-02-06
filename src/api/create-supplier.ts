import { api } from '@/lib/axios'

export interface CreateSupplierBody {
    name: string
    document?: string | null
    email?: string | null
    phone?: string | null
}

export async function createSupplier(body: CreateSupplierBody) {
    await api.post('/suppliers', body)
}
