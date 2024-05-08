import { api } from '@/lib/axios'

export interface UpdateStatusTreatmentParams {
  id: string
  status: string
  endingDate?: Date
}

export async function updateStatusTreatment({
  id,
  status,
  endingDate,
}: UpdateStatusTreatmentParams) {
  console.log(id, status, endingDate)
  await api.patch(`/treatment/${id}`, {
    status,
    ending_date: endingDate,
  })
}
