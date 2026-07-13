import { api } from '@/lib/axios'

interface FinishTreatmentParams {
    treatmentId: string
    payments?: Array<{
        payment_id: string
        amount: number
        occurrences: number
        date?: string
        is_paid?: boolean
        description?: string
    }>
}

export async function finishTreatment({ treatmentId, payments }: FinishTreatmentParams) {
    const response = await api.patch(`/treatment/${treatmentId}/finish`, { payments })

    return response.data
}
