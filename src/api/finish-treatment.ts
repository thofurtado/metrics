import { api } from '@/lib/axios'

interface FinishTreatmentParams {
    treatmentId: string
}

export async function finishTreatment({ treatmentId }: FinishTreatmentParams) {
    const response = await api.patch(`/treatment/${treatmentId}/finish`)

    return response.data
}
