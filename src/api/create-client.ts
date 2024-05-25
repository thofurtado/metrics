import { z } from 'zod'

import { api } from '@/lib/axios'

const clientForm = z.object({
  name: z.string(),
  identification: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  contract: z.boolean().nullish(),
})

type ClientForm = z.infer<typeof clientForm>

export async function createClient({
  name,
  identification,
  phone,
  email,
  contract,
}: ClientForm) {
  const response = await api.post(`/client`, {
    name,
    identification,
    phone,
    email,
    contract,
  })
  return response
}
