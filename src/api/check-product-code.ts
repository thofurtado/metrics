import { api } from '@/lib/axios'

export async function checkProductCode({ code }: { code: number }) {
    const response = await api.get<{ available: boolean }>('/products/check-code', {
        params: { code }
    })
    return response.data
}
