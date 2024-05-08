import { api } from '@/lib/axios'
import { TreatmentTableRowProps } from '@/pages/app/treatments/treatment-table-row'

export interface GetTreatmentDetailsParams {
  treatmentId: string
}

export async function getTreatmentDetails({
  treatmentId,
}: GetTreatmentDetailsParams) {
  const response = await api.get<TreatmentTableRowProps>(
    `/treatment/${treatmentId}`,
  )
  return response.data.treatments
}
