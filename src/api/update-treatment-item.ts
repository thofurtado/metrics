import { z } from 'zod'

import { api } from '@/lib/axios'

const updateTreatmentItemForm = z.object({
  treatmentItemId: z.string().uuid(),
  quantity: z.number().optional(),
  salesValue: z.number().optional(),
  discount: z.number().optional(),
  observations: z.string().optional(),
})

type UpdateTreatmentItemForm = z.infer<typeof updateTreatmentItemForm>

export async function updateTreatmentItem({
  treatmentItemId,
  quantity,
  salesValue,
  discount,
  observations,
}: UpdateTreatmentItemForm) {
  const response = await api.patch(`/treatment-item/${treatmentItemId}`, {
    quantity,
    value: salesValue,
    discount,
    observations,
  })
  return response
}
