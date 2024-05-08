import { z } from 'zod'

import { api } from '@/lib/axios'

const treatmentForm = z.object({
  openingDate: z.date().nullish(),
  endingDate: z.date().nullish(),
  request: z.string(),
  observation: z.string().nullish(),
  client: z.string(),
  status: z.string().nullish(),
  contact: z.string().nullish(),
})

type TreatmentForm = z.infer<typeof treatmentForm>

export async function createTreatment({
  openingDate,
  endingDate,
  request,
  observation,
  status,
  contact,
  client,
}: TreatmentForm) {
  console.log(
    openingDate,
    endingDate,
    request,
    observation,
    status,
    contact,
    client,
  )
  const response = await api.post(`/treatment`, {
    opening_date: openingDate,
    ending_date: endingDate,
    request,
    observations: observation,
    status,
    contact,
    client_id: client,
  })
  return response
}
