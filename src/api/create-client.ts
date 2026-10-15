import { z } from 'zod'

import { api } from '@/lib/axios'

const clientForm = z.object({
  name: z.string(),
  identification: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  contract: z.boolean().nullish(),
  contact: z.string().nullish(),
  isEnterprise: z.boolean().nullish(),
  // Fase 4 do Mergulho (16:A8): confirma o cadastro quando o telefone já é de outro cliente
  allowDuplicatePhone: z.boolean().nullish(),
})

type ClientForm = z.infer<typeof clientForm>

export async function createClient({
  name,
  identification,
  phone,
  email,
  contract,
  contact,
  isEnterprise,
  allowDuplicatePhone,
}: ClientForm) {
  const response = await api.post(`/client`, {
    name,
    identification,
    phone,
    email,
    contract,
    contact,
    isEnterprise,
    allowDuplicatePhone,
  })
  return response
}
