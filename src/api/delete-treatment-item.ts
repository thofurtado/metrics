import { api } from '@/lib/axios'

export interface DeleteTreatmentItemParams {
  treatmentItemId: string
}

export async function deleteTreatmentItem({
  treatmentItemId,
}: DeleteTreatmentItemParams) {
  const response = await api.delete(`/treatment-item/${treatmentItemId}`)
  return response
}
