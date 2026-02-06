import { api } from '@/lib/axios'

export interface UpdateSupplierBody {
    id: string
    name?: string
    document?: string | null
    email?: string | null
    phone?: string | null
}

export async function updateSupplier({ id, ...body }: UpdateSupplierBody) {
    await api.put(`/suppliers/${id}`, body)
}
