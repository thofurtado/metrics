import { z } from 'zod'

import { api } from '@/lib/axios'

const treatmentItemForm = z.object({
  itemId: z.string().uuid(),
  treatmentId: z.string().uuid(),
  quantity: z.number(),
  salesValue: z.number(),
  discount: z.number().optional(),
})

type TreatmentItemForm = z.infer<typeof treatmentItemForm>

export async function createTreatmentItem({
  treatmentId,
  itemId,
  quantity,
  salesValue,
  discount,
}: TreatmentItemForm) {
  const response = await api.post(`/treatment-item`, {
    treatment_id: treatmentId,
    item_id: itemId,
    quantity,
    value: salesValue,
    discount,
  })
  console.log(response)
  return response
}
