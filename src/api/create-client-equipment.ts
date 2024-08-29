import { z } from 'zod'

import { api } from '@/lib/axios'

const clientForm = z.object({
  client_id: z.string(),
  type: z.string().nullish(),
  brand: z.string().nullish(),
  identification: z.string().nullish(),
  details: z.string().nullish(),
})

type EquipmentForm = z.infer<typeof clientForm>

export async function createClientEquipment({
  client_id,
  identification,
  type,
  brand,
  details,
}: EquipmentForm) {
  console.log(client_id, identification, type, brand, details)
  const response = await api.post(`/equipment`, {
    client_id,
    identification,
    type,
    brand,
    details,
  })
  return response
}
